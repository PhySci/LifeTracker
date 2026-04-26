# TODO List

1. [x] Add the ability to create activities.
2. [x] Add the table schema and entity descriptions to `README.md`.
3. [x] Make `date` optional when creating an event; when it is omitted, the backend uses the current local date.
4. [x] Add the `Category` entity and table; link `Activity` to it through `category_id`.
5. [x] Add backend logging with centralized startup initialization and meaningful messages for startup, errors, and key API actions.
6. [x] Run the backend application through `python -m backend.app` instead of calling the `uvicorn` CLI directly.
7. [x] Rewrite documentation and code comments in English.