const config = require("config");
const uuid = require("uuid/v4");
const { Engine } = require("json-rules-engine");

const rulesJSON = require("./phase-rules.json");
const errors = require("../common/errors");

const helper = require("../common/helper");
const { PhaseFact } = require('../../app-constants');

// Helper functions

// TODO: Move these to a common place

const normalizeName = (name) => name.replace(/ /g, "");

const shouldCheckConstraint = (operation, phase, constraintName, rules) => {
  const normalizedConstraintName = normalizeName(constraintName);
  return (
    operation === "close" &&
    phase.constraints &&
    rules.constraintRules[normalizeName(phase.name)]?.includes(normalizedConstraintName)
  );
};

const parseDate = (dateString) => {
  const date = new Date(dateString).getTime();
  return isNaN(date) ? null : date;
};

// End of helper functions

class PhaseAdvancer {
  #rules = rulesJSON;
  #challengeDomain;

  constructor(challengeDomain) {
    this.#challengeDomain = challengeDomain;
  }

  #factGenerators = {
    Registration: async (challengeId, phaseSpecificFacts) => ({
      registrantCount: await this.#getRegistrantCount(challengeId),
    }),
    Submission: async (challengeId, phaseSpecificFacts) => ({
      submissionCount: await this.#getSubmissionCount(challengeId),
    }),
    Review: async (challengeId, phaseSpecificFacts) => ({
      allSubmissionsReviewed: await this.#areAllSubmissionsReviewed(challengeId),
    }),
    IterativeReview: async (challengeId, phaseSpecificFacts, phases) => ({
      hasActiveUnreviewedSubmissions: await this.#hasActiveUnreviewedSubmissions(
        challengeId,
        phaseSpecificFacts,
        phases
      ),
      wasSubmissionReviewedInCurrentOpenIterativeReviewPhase:
        await this.#wasSubmissionReviewedInCurrentOpenIterativeReviewPhase(
          challengeId,
          phaseSpecificFacts
        ),
      hasWinningSubmission: await this.#hasWinningSubmission(phaseSpecificFacts),
      insertIterativeReviewPhaseOnCloseWithoutWinningSubmission: true,
      shouldOpenNextIterativeReviewPhase: await this.#shouldOpenNextIterativeReviewPhase(
        phaseSpecificFacts
      ),
    }),
    AppealsResponse: async (challengeId) => ({
      allAppealsResolved: await this.#areAllAppealsResolved(challengeId),
    }),
  };

  async #generateFacts(challengeId, legacyId, phases, phase, operation) {
    const phaseSpecificFactRequest = {
      legacyId,
      facts: this.#getPhaseFactName(phase.name),
    };

    const phaseSpecificFacts = await this.#challengeDomain.getPhaseFacts(phaseSpecificFactRequest);
    const facts = {
      name: phase.name,
      isOpen: phase.isOpen,
      isClosed: !phase.isOpen && phase.actualEndDate != null,
      isPastScheduledStartTime: this.#isPastTime(phase.scheduledStartDate),
      isPastScheduledEndTime: this.#isPastTime(phase.scheduledEndDate),
      isPostMortemOpen: phases.find((p) => p.name === "Post-Mortem")?.isOpen,
      hasPredecessor: phase.predecessorId != null,
      isPredecessorPhaseClosed:
        phase.predecessorId != null
          ? this.#isPastTime(phases.find((p) => p.phaseId === phase.predecessorId)?.actualEndDate)
          : true,
      nextPhase: phases.find((p) => p.predecessor === phase.phaseId)?.name,
    };

    if (this.#factGenerators[normalizeName(phase.name)]) {
      const additionalFacts = await this.#factGenerators[normalizeName(phase.name)](
        challengeId,
        phaseSpecificFacts,
        phases
      );
      Object.assign(facts, additionalFacts);
    }

    return facts;
  }

  async advancePhase(challengeId, legacyId, phases, operation, phaseName) {
    phaseName = phaseName.replace(/-/g, " ");

    const matchedPhases = phases
      .filter((phase) => phase.actualEndDate == null && phase.name === phaseName)
      .sort((a, b) => new Date(a.scheduledStartDate) - new Date(b.scheduledStartDate));

    if (matchedPhases.length === 0) {
      throw new errors.BadRequestError(`Phase ${phaseName} not found or already closed`);
    }

    const phase = matchedPhases[0]; // We only advance the earliest phase

    const essentialRules = this.#rules[`${operation}Rules`][normalizeName(phase.name)]
      ? this.#rules[`${operation}Rules`][normalizeName(phase.name)].map((rule) => ({
          name: rule.name,
          conditions: rule.conditions,
          event: rule.event,
        }))
      : [];

    const constraintRules =
      phase.constraints
        ?.filter((constraint) =>
          shouldCheckConstraint(operation, phase, constraint.name, this.#rules)
        )
        .map((constraint) => ({
          name: `Constraint: ${constraint.name}`,
          conditions: {
            all: [
              {
                fact: this.#rules.constraintNameFactMap[normalizeName(constraint.name)],
                operator: "greaterThanInclusive",
                value: constraint.value,
              },
            ],
          },
          event: {
            type: `can${operation.toLowerCase()}`,
          },
        })) || [];

    const rules = [...essentialRules, ...constraintRules];
    const facts = await this.#generateFacts(challengeId, legacyId, phases, phase, operation);

    for (const rule of rules) {
      const ruleExecutionResult = await this.#executeRule(rule, facts);

      if (!ruleExecutionResult.success) {
        return {
          success: false,
          message: `Cannot ${operation} phase ${phase.name} for challenge ${challengeId}`,
          detail: `Rule ${rule.name} failed`,
          failureReasons: ruleExecutionResult.failureReasons,
        };
      }
    }

    let next = [];

    if (operation === "open") {
      await this.#open(challengeId, phases, phase);
    } else if (operation === "close") {
      await this.#close(challengeId, phases, phase);

      if (facts.hasWinningSubmission) {
        console.log("Challenge has a winning submission. Close the challenge.");
      } else {
        console.log("Checking if inserting a phase is required");
        const insertedPhase = this.#insertPhaseIfRequired(phases, phase, facts);

        if (insertedPhase) {
          next.push(insertedPhase);
        }
      }
      if (next.length == 0) {
        next = phases.filter((p) => p.predecessor === phase.phaseId);
      }
    }

    return {
      success: true,
      hasWinningSubmission: facts.hasWinningSubmission,
      message: `Successfully ${operation}d phase ${phase.name} for challenge ${challengeId}`,
      updatedPhases: phases,
      next: {
        operation: operation === "close" && next.length > 0 ? "open" : undefined,
        phases: next,
      },
    };
  }

  async #open(challengeId, phases, phase) {
    phase.isOpen = true;
    const actualStartDate = new Date();
    phase.actualStartDate = actualStartDate.toISOString();
    phase.scheduledEndDate = new Date(
      actualStartDate.getTime() + phase.duration * 1000
    ).toISOString();

    const scheduledStartDate = parseDate(phase.scheduledStartDate);
    const delta = scheduledStartDate - actualStartDate; // in milliseconds

    if (delta !== 0) {
      console.log("Updating subsequent phases");
      this.#updateSubsequentPhases(phases, phase, -delta);
    }

    console.log(`Updated phases: ${JSON.stringify(phases)}`);
  }

  async #close(challengeId, phases, phase) {
    console.log(`Closing phase ${phase.name} for challenge ${challengeId}`);

    phase.isOpen = false;
    const actualEndDate = new Date();
    phase.actualEndDate = actualEndDate.toISOString();

    const scheduledEndDate = parseDate(phase.scheduledEndDate);
    const delta = scheduledEndDate - actualEndDate;

    if (delta !== 0) {
      this.#updateSubsequentPhases(phases, phase, -delta);
    }

    console.log(`Updated phases: ${JSON.stringify(phases)}`);
  }

  #insertPhaseIfRequired(phases, phase, facts) {
    // Check if inserting Iterative Review phase is required
    if (
      !facts.hasWinningSubmission &&
      facts.insertIterativeReviewPhaseOnCloseWithoutWinningSubmission
    ) {
      const phaseToAdd = {
        id: uuid(),
        phaseId: phase.phaseId,
        name: phase.name,
        duration: 24 * 60 * 60, // 24 hours
        scheduledStartDate: phase.actualEndDate,
        scheduledEndDate: new Date(
          parseDate(phase.actualEndDate) + phase.duration * 1000
        ).toISOString(),
        actualStartDate:
          facts.shouldOpenNextIterativeReviewPhase == true ? phase.actualEndDate : undefined,
        actualEndDate: undefined,
        isOpen: facts.shouldOpenNextIterativeReviewPhase == true,
        constraints: phase.constraints,
        description: phase.description,
        predecessor: phase.id,
      };
      phases.push(phaseToAdd);

      return phaseToAdd;
    }
    return null;
  }

  #isPastTime(dateString) {
    if (dateString == null) {
      return false;
    }
    const date = new Date(dateString);
    const now = new Date();
    return date <= now;
  }

  async #getRegistrantCount(challengeId) {
    console.log(`Getting registrant count for challenge ${challengeId}`);
    // TODO: getChallengeResources loops through all pages, which is not necessary here, we can just get the first page and total count from header[X-Total]
    const submitters = await helper.getChallengeResourcesCount(
      challengeId,
      config.SUBMITTER_ROLE_ID
    );
    return submitters[config.SUBMITTER_ROLE_ID] || 0;
  }

  async #getSubmissionCount(challengeId) {
    console.log(`Getting submission count for challenge ${challengeId}`);
    // TODO: getChallengeSubmissions loops through all pages, which is not necessary here, we can just get the first page and total count from header[X-Total]
    const submissions = await helper.getChallengeSubmissionsCount(challengeId);
    return submissions["Contest Submission"] || 0;
  }

  async #areAllSubmissionsReviewed(challengeId) {
    console.log(`Getting review count for challenge ${challengeId}`);
    return Promise.resolve(true);
  }

  async #areAllAppealsResolved(challengeId) {
    console.log(`Checking if all appeals are resolved for challenge ${challengeId}`);
    return Promise.resolve(false);
  }

  async #wasSubmissionReviewedInCurrentOpenIterativeReviewPhase(challengeId, phaseSpecificFacts) {
    const { factResponses } = phaseSpecificFacts;
    if (!factResponses || factResponses.length === 0) {
      return false;
    }
    const [
      { response: { wasSubmissionReviewedInCurrentOpenIterativeReviewPhase = false } } = {
        response: { wasSubmissionReviewedInCurrentOpenIterativeReviewPhase: false },
      },
    ] = factResponses;

    return wasSubmissionReviewedInCurrentOpenIterativeReviewPhase;
  }

  async #shouldOpenNextIterativeReviewPhase(phaseSpecificFacts) {
    const { factResponses } = phaseSpecificFacts;
    if (!factResponses || factResponses.length === 0) {
      return false;
    }
    const [
      { response: { submissionCount = 0, reviewCount = 0 } } = {
        response: { submissionCount: 0, reviewCount: 0 },
      },
    ] = factResponses;

    return submissionCount > reviewCount + 1; // are there pending reviews after the current one?
  }

  async #hasActiveUnreviewedSubmissions(challengeId, phaseSpecificFacts, phases) {
    console.log(
      `Checking if there are active unreviewed submissions for challenge ${challengeId} using phaseSpecificFacts: ${JSON.stringify(
        phaseSpecificFacts
      )}`
    );

    if (phaseSpecificFacts.factResponses.length > 0) {
      const [
        { response: { submissionCount = 0, reviewCount = 0 } } = {
          response: { submissionCount: 0, reviewCount: 0 },
        },
      ] = phaseSpecificFacts.factResponses;

      const numClosedIterativeReviewPhases = phases.filter(
        (phase) => phase.phaseType === "Iterative Review" && !phase.isOpen
      ).length;

      console.log(
        `numClosedIterativeReviewPhases: ${numClosedIterativeReviewPhases}; submissionCount: ${submissionCount}; reviewCount: ${reviewCount}`
      );

      return submissionCount > reviewCount + numClosedIterativeReviewPhases;
    }
    return Promise.resolve(false);
  }

  async #hasWinningSubmission(phaseSpecificFacts) {
    const { factResponses } = phaseSpecificFacts;
    if (!factResponses || factResponses.length === 0) {
      return false;
    }
    const [
      { response: { hasWinningSubmission = false } } = {
        response: { hasWinningSubmission: false },
      },
    ] = factResponses;

    return hasWinningSubmission;
  }

  async #executeRule(rule, facts) {
    const ruleEngine = new Engine();
    ruleEngine.addRule(rule);
    const result = await ruleEngine.run(facts);

    const failureReasons = result.failureResults.map((failureResult) => ({
      rule: rule.name,
      failedConditions: failureResult.conditions.all
        .filter((condition) => !condition.result)
        .map((condition) => ({
          fact: condition.fact,
          operator: condition.operator,
          value: condition.value,
        })),
    }));

    return {
      success: result.events.length > 0,
      failureReasons,
    };
  }

  // prettier-ignore
  #updateSubsequentPhases(phases, currentPhase, delta) {
    let nextPhase = phases.find((phase) => phase.predecessor === currentPhase.phaseId);
    console.log('next-phase');

    while (nextPhase) {
      nextPhase.scheduledStartDate = new Date(new Date(nextPhase.scheduledStartDate).getTime() + delta).toISOString();
      nextPhase.scheduledEndDate = new Date(new Date(nextPhase.scheduledEndDate).getTime() + delta).toISOString();
      nextPhase = phases.find((phase) => phase.predecessor === nextPhase.phaseId);
    }
  }

  #getPhaseFactName(phaseName) {
    if (phaseName === "Submission") {
      return [PhaseFact.PHASE_FACT_SUBMISSION];
    }
    if (phaseName === "Review") {
      return [PhaseFact.PHASE_FACT_REVIEW];
    }
    if (phaseName === "Iterative Review") {
      return [PhaseFact.PHASE_FACT_ITERATIVE_REVIEW];
    }
    if (phaseName === "Appeals") {
      return [PhaseFact.PHASE_FACT_APPEALS];
    }

    return [];
  }
}

module.exports = PhaseAdvancer;
