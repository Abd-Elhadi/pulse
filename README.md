### CS572 Final Project - March 2026 - Application specifications and requirements
You are responsible for defining your project's specifications and requirements. Take time to plan your project idea, write a brief description, set clear goals, and establish a well-defined scope. Your project must meet the following requirements:
* Implement a login-based system using JSON Web Tokens (JWT) for authentication, with support for access and refresh tokens.
* Integrate AI features into the application, such as function calling, AI workflows or agents, or Retrieval-Augmented Generation (RAG).
* Protect all frontend add/update/delete actions and routes from public access using JWT, except for sign-up and sign-in routes.
* Secure all backend add/update/delete routes from public access using JWT, except for sign-up and sign-in routes.
* Apply lazy loading to frontend routes and comply to standard REST design principles for the backend.
* Ensure both frontend and backend code are strictly typed, avoiding the use of explicit or implicit `any` types.
* Use the latest Angular API (v21) specifications for frontend development, avoiding deprecated practices.
* Use Zoneless Angular template and manage your application global and local states using `signal` API.
* Develop a user interface that comply to web standards, utilizing Angular Material or any other comparable UI kit.
  
### Notes and Policies
* **Project Initiation:** Prepare a detailed project description, UI screen sketches, and a MongoDB schema design. Contact me on Teams to review and approve the database design and project scope before starting to code.
* **Classroom Attendance:** Physical attendance in the classroom is not required during the project.
* **Instructor Availability:** I am available for support via Teams during regular class hours (10:00 AM–12:30 PM and 2:00 PM–3:00 PM, Monday through Saturday).
* **Student Availability:** You must be reachable via Teams during class hours for periodic check-ins. Failure to respond to Teams calls or messages within 60 minutes may impact your final grade.
* **Code Submission:** Submit a daily code push by the end of each day to demonstrate progress. Each push must include commits organized by feature. Missing pushes or inadequate commits may affect your final grade.
      
### Technical Evaluation
The final git push must be performed before 9:00 PM on Wednesday. Prepare a screen-recorded demo that introduces the project concept and demonstrates system usage and send me the video URL. Do not include or discuss code patterns in the video, as code evaluations will be conducted separately. I will call you, Thursday, on Teams as per the following schedule:  
* 10:00 AM - Oumar Abdelhadi
* 10:30 AM - Temuujin Bat Amgalan 

### Extra-Credit Options
```diff
+2 Points: Role-based Access Control (RBAC)
```
Implement user roles (Admin, Editor, Viewer) with separate permissions enforced both in frontend route guards and backend middleware.
```diff
+2 Points: Audit Logging
```
Track all add/update/delete actions with timestamp, user ID, and action type stored in a separate MongoDB collection, and show an admin-only audit log screen. Add an AI dashboard that summarizes token consumption statistics.
```diff
+2 Points: Unit and E2E Testing Coverage
```
Achieve 85–90% coverage with Jest (backend) and Karma/Jasmine or Cypress (frontend).
  
### Code Honor Submission Policy
All submitted code must be original. Submitting code from another source as your own, including copied patterns or snippets, constitutes plagiarism and will impact your grade. Using AI code assistance tools to generate/write code is prohibited for this project. Failure to answer any question about your code during the technical evaluation will result in a No Credit (NC) grade and an academic misconduct warning for plagiarism. However, AI is permitted to assist you in explaining the steps of resolving an issue. AI is also permitted for writing prompts. Refer to the course syllabus for more details of the policies.
