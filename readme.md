![Cover-Voice logo](https://cover-voice.dev/Cover-Voice_192x192.svg)

# Cover Voice 
Cover letters in your own voice

[![Deploy Production](https://github.com/TeeEnnEnn/cover-voice/actions/workflows/deploy-prod.yml/badge.svg)](https://github.com/TeeEnnEnn/cover-voice/actions/workflows/deploy-prod.yml)
[![CI](https://github.com/TeeEnnEnn/cover-voice/actions/workflows/ci.yml/badge.svg)](https://github.com/TeeEnnEnn/cover-voice/actions/workflows/ci.yml)

## Overview

Cover-Voice allows you to compose cover letters from blocks and variables. This allows you to reuse components from your best cover letters and makes the process of writing cover letters more efficient. 

1. Create variables 
2. Create blocks that can reference variables with the `{{ my_var }}` syntax
3. Create letters that can reference blocks with the `{% my_block %}` syntax

## Architecture

Frontend:  SvelteKit
Backend: Express
Database: Postgres

## dev commands

```sh
docker compose up
docker compose up frontend --build
docker compose up backend --build
```
