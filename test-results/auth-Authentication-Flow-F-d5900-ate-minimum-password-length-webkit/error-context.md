# Page snapshot

```yaml
- heading "Create an account" [level=1]
- paragraph: Enter your details below to create your account
- heading "Sign Up" [level=3]
- paragraph: Choose your preferred sign up method
- button "Google":
  - img
  - text: Google
- button "GitHub":
  - img
  - text: GitHub
- text: Or continue with Full Name
- textbox "Full Name"
- text: Email
- textbox "Email": test.validation.min.1754409830528@example.com
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