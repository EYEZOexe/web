# Page snapshot

```yaml
- heading "Create an account" [level=1]
- paragraph: Enter your details below to create your account
- heading "Sign Up" [level=3]
- paragraph: Choose your preferred sign up method
- alert: Password must be at least 6 characters
- button "Google":
  - img
  - text: Google
- button "GitHub":
  - img
  - text: GitHub
- text: Or continue with Full Name
- textbox "Full Name": Test User
- text: Email
- textbox "Email": test@example.com
- text: Password
- textbox "Password": "123"
- text: Confirm Password
- textbox "Confirm Password": "123"
- button "Create Account"
- text: Already have an account?
- link "Sign in":
  - /url: /auth/signin
- alert
```