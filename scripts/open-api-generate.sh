#!/usr/bin/env bash

cd backend
npm run generate:openapi
cd ..
cd frontend
npm run generate:types
