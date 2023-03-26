docker run --attach STDOUT \
  -e AWS_REGION=${AWS_REGION} \
  -e AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} \
  -e AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
  -e AWS_SESSION_TOKEN=${AWS_SESSION_TOKEN} \
  --publish 2000:2000/udp \
  public.ecr.aws/xray/aws-xray-daemon -o