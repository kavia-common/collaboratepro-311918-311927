#!/bin/bash
cd /home/kavia/workspace/code-generation/collaboratepro-311918-311927/project_management_backend
npm run lint
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

