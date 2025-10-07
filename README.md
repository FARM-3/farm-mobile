# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Plan

use APIservice to manage connections to Django. use one token for a long time. it is JWT authentication. 
From that, have servvices for each section.
Ensure all pages use one header and bottom navbar.
use relevant API endpoints.
AS Opposed to pages fetching data when visited on the front, should do it in backend
All data should be saved to sqlite db, then should be syncable. when new record sis made, save local, then try to save to cloud, if fail to save to cloud, mark as unsynced, and proceed. sync button in top bar to sync data. go record by record in loop for now since we do not have endpoints for lists yet. 

Login Service: 
use share API details, accept login as stated and reset pin. handle token using best satandards.
API endpoint for user login.

Endpoint: POST /api/users/login/

Request body: { "phone": "0700000000", "pin": "1234" }

Response (success): { "message": "Login successful", "user": { "id": 1, "phone": "0700000000", "role": "manager", "role_display": "Farm Manager" }, "access": "eyJ0eXAiOiJKV1...", # JWT token for auth "refresh": "eyJ0eXAiOiJKV1..." # Refresh token }

Response (failure): { "error": "Invalid phone number or PIN" }Get user's security question (needed before PIN reset).

Endpoint: POST /api/users/security-question/

Request body: { "phone": "0700000000" }

Response (success): { "phone": "0700000000", "security_question": "What is your mother's name?" }

Response (failure): { "error": "User not found" }/api/users/token/refresh/

Takes a refresh type JSON web token and returns an access type JSON web token if the refresh token is valid.Reset user's PIN using security question.

Endpoint: POST /api/users/reset-pin/

Request body: { "phone": "0700000000", "security_answer": "maria", "new_pin": "5678" }

Response (success): { "message": "PIN reset successful. You can now login with your new PIN." }

Response (failure): { "error": "Incorrect security answer" }Get current logged-in user's information. Requires JWT token in Authorization header.

Endpoint: GET /api/users/me/

Headers: Authorization: Bearer <access_token>

Response: { "id": 1, "phone": "0700000000", "role": "manager", "role_display": "Farm Manager" }

Some other endpoints are present in sample-swagger.yaml. not all are complete, some will be changed, so you can just follow best practices. focus on getting login, reset pin, etc to work flawlessly. follow best practices. 