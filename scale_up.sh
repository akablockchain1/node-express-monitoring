#!/bin/bash
# scale_up.sh
docker-compose up -d --scale app=$(( $(docker-compose ps -q app | wc -l) + 1 ))
