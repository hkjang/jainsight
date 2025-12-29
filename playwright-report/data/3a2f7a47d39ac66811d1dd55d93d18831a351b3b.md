# Page snapshot

```yaml
- generic [ref=e1]:
  - complementary [ref=e2]:
    - heading "Jainsight" [level=1] [ref=e4]
    - navigation [ref=e5]:
      - list [ref=e6]:
        - listitem [ref=e7]:
          - link "Dashboard" [ref=e8] [cursor=pointer]:
            - /url: /
        - listitem [ref=e9]:
          - link "DB Connections" [ref=e10] [cursor=pointer]:
            - /url: /connections
        - listitem [ref=e11]:
          - link "SQL Editor" [ref=e12] [cursor=pointer]:
            - /url: /editor
        - listitem [ref=e13]:
          - link "Schema Explorer" [ref=e14] [cursor=pointer]:
            - /url: /schemas
    - generic [ref=e15]:
      - generic [ref=e16]: "User: ()"
      - button "Sign Out" [ref=e17]
  - main [ref=e18]:
    - generic [ref=e20]:
      - heading "Create Account" [level=2] [ref=e21]
      - generic [ref=e22]:
        - generic [ref=e23]:
          - text: Email
          - textbox [ref=e24]
        - generic [ref=e25]:
          - text: Password
          - textbox [ref=e26]
        - button "Register" [ref=e27]
      - button "Already have an account? Login" [active] [ref=e29]
  - button "Open Next.js Dev Tools" [ref=e35] [cursor=pointer]:
    - img [ref=e36]
  - alert [ref=e39]
```