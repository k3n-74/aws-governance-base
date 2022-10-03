```shell

export JUMP_AWS_ACCOUNT_ID="xxxxxx"

$ #########################
$ ## jump aws account

$ # permissions boundary
$ aws cloudformation deploy --stack-name gov-base---permissions-boundary --template-file ./permissions-boundary.yaml --capabilities CAPABILITY_NAMED_IAM --region ap-northeast-1 --no-fail-on-empty-changeset

$ # group
$ aws cloudformation deploy --stack-name gov-base---switch-role-users-group --template-file ./switch-role-users-group.yaml --capabilities CAPABILITY_NAMED_IAM --region ap-northeast-1 --no-fail-on-empty-changeset

$ # switch role target
$ aws cloudformation deploy --stack-name gov-base---switch-role-target-role --template-file ./switch-role-target-role.yaml --parameter-overrides JumpAwsAccountId=${JUMP_AWS_ACCOUNT_ID} --capabilities CAPABILITY_NAMED_IAM --region ap-northeast-1 --no-fail-on-empty-changeset

$ #########################
$ ## except jump aws account

$ # permissions boundary
$ aws cloudformation deploy --stack-name gov-base---permissions-boundary --template-file ./permissions-boundary.yaml --capabilities CAPABILITY_NAMED_IAM --region ap-northeast-1 --no-fail-on-empty-changeset

$ # switch role target
$ aws cloudformation deploy --stack-name gov-base---switch-role-target-role --template-file ./switch-role-target-role.yaml --parameter-overrides JumpAwsAccountId=${JUMP_AWS_ACCOUNT_ID} --capabilities CAPABILITY_NAMED_IAM --region ap-northeast-1 --no-fail-on-empty-changeset
```
