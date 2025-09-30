# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e7]
      - heading "Connexion à Phoenix" [level=1] [ref=e12]
      - paragraph [ref=e13]: Reprenez votre parcours de développement de carrière.
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: Email
        - textbox "vous@exemple.com" [ref=e17]
      - generic [ref=e18]:
        - generic [ref=e19]: Mot de passe
        - textbox "********" [ref=e20]
      - button "Se connecter" [ref=e21]
    - paragraph [ref=e22]:
      - text: Pas encore de compte ?
      - link "Créer mon espace" [ref=e23] [cursor=pointer]:
        - /url: /auth/register
  - alert [ref=e24]
```