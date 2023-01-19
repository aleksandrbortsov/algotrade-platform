# algotrade-platform
Microservices platform to manage TinkoffAPI


Для работы config-service необходимо сгенерить ssh-rsa ключ с помощью 
ssh-keygen -m PEM -t rsa -b 4096 -f ~/config_server_deploy_key.rsa
этот Public ключ нужен на gitgub.com в Settings.
Затем:
ssh -T git@github.com
