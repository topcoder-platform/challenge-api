# Create the Challenge table
aws dynamodb create-table --table-name Challenge --attribute-definitions AttributeName=id,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --region eu-central-1 --provisioned-throughput ReadCapacityUnits=4,WriteCapacityUnits=2 --endpoint-url http://localhost:7777
# Create the ChallengeType table
aws dynamodb create-table --table-name ChallengeType --attribute-definitions AttributeName=id,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --region eu-central-1 --provisioned-throughput ReadCapacityUnits=4,WriteCapacityUnits=2 --endpoint-url http://localhost:7777
# Create the ChallengeSetting table
aws dynamodb create-table --table-name ChallengeSetting --attribute-definitions AttributeName=id,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --region eu-central-1 --provisioned-throughput ReadCapacityUnits=4,WriteCapacityUnits=2 --endpoint-url http://localhost:7777
# Create the AuditLog table
aws dynamodb create-table --table-name AuditLog --attribute-definitions AttributeName=id,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --region eu-central-1 --provisioned-throughput ReadCapacityUnits=4,WriteCapacityUnits=2 --endpoint-url http://localhost:7777
