const config = require("config");
const { Engine } = require("json-rules-engine");

const rulesJSON = require("./phase-rules.json");
const errors = require("../common/errors");

const helper = require("../common/helper");

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

  #factGenerators = {
    Registration: async (challengeId) => ({
      registrantCount: await this.#getRegistrantCount(challengeId),
    }),
    Submission: async (challengeId) => ({
      submissionCount: await this.#getSubmissionCount(challengeId),
      hasActiveUnreviewedSubmissions: await this.#hasActiveUnreviewedSubmissions(challengeId),
    }),
    Review: async (challengeId) => ({
      allSubmissionsReviewed: await this.#areAllSubmissionsReviewed(challengeId),
    }),
    IterativeReview: async (challengeId) => ({
      hasActiveUnreviewedSubmissions: await this.#hasActiveUnreviewedSubmissions(challengeId),
    }),
    AppealsResponse: async (challengeId) => ({
      allAppealsResolved: await this.#areAllAppealsResolved(challengeId),
    }),
  };

  async #generateFacts(challengeId, phases, phase, operation) {
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
      const additionalFacts = await this.#factGenerators[normalizeName(phase.name)](challengeId);
      Object.assign(facts, additionalFacts);
    }

    return facts;
  }

  async advancePhase(challengeId, phases, operation, phaseName) {
    const phase = phases.find((phase) => phase.name === phaseName);

    if (!phase) {
      throw new errors.BadRequestError(`Phase ${phaseName} not found`);
    }

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
          fact: normalizeName(constraint.name),
          operator: "greaterOrEqual",
          value: constraint.value,
        })) || [];

    const rules = [...essentialRules, ...constraintRules];
    const facts = await this.#generateFacts(challengeId, phases, phase, operation);

    console.log("rules", JSON.stringify(rules, null, 2));
    console.log("facts", JSON.stringify(facts, null, 2));

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

    if (operation === "open") {
      await this.#open(challengeId, phases, phase);
    } else if (operation === "close") {
      await this.#close(challengeId, phases, phase);
    }

    const next = operation === "close" ? phases.filter((p) => p.predecessor === phase.phaseId) : [];

    return {
      success: true,
      message: `Successfully ${operation}d phase ${phase.name} for challenge ${challengeId}`,
      updatedPhases: phases,
      next: {
        operation: operation === "close" && next.length > 0 ? "open" : undefined,
        phases: next,
      },
    };
  }

  async #open(challengeId, phases, phase) {
    console.log(`Opening phase ${phase.name} for challenge ${challengeId}`);

    phase.isOpen = true;
    const actualStartDate = new Date();
    phase.actualStartDate = actualStartDate.toISOString();
    phase.scheduledEndDate = new Date(
      actualStartDate.getTime() + phase.duration * 1000
    ).toISOString();

    const scheduledStartDate = parseDate(phase.scheduledStartDate);
    const delta = scheduledStartDate - actualStartDate; // in milliseconds

    if (delta !== 0) {
      this.#updateSubsequentPhases(phases, phase, -delta);
    }

    console.log(`Updated phases: ${JSON.stringify(phases, null, 2)}`);
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

    console.log(`Updated phases: ${JSON.stringify(phases, null, 2)}`);
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
    const submitters = await helper.getChallengeResources(challengeId, config.SUBMITTER_ROLE_ID);
    return submitters.length;
  }

  async #getSubmissionCount(challengeId) {
    console.log(`Getting submission count for challenge ${challengeId}`);
    // TODO: getChallengeSubmissions loops through all pages, which is not necessary here, we can just get the first page and total count from header[X-Total]
    const submissions = await helper.getChallengeSubmissions(challengeId);
    return submissions.length;
  }

  async #areAllSubmissionsReviewed(challengeId) {
    console.log(`Getting review count for challenge ${challengeId}`);
    return Promise.resolve(false);
  }

  async #areAllAppealsResolved(challengeId) {
    console.log(`Checking if all appeals are resolved for challenge ${challengeId}`);
    return Promise.resolve(false);
  }

  async #hasActiveUnreviewedSubmissions(challengeId) {
    console.log(`Checking if there are active unreviewed submissions for challenge ${challengeId}`);
    return Promise.resolve(false);
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

    while (nextPhase) {
      nextPhase.scheduledStartDate = new Date(new Date(nextPhase.scheduledStartDate).getTime() + delta).toISOString();
      nextPhase.scheduledEndDate = new Date(new Date(nextPhase.scheduledEndDate).getTime() + delta).toISOString();
      nextPhase = phases.find((phase) => phase.predecessor === nextPhase.phaseId);
    }
  }
}

module.exports = new PhaseAdvancer();
