---
auto_execution_mode: 1
---
description: Scaffolds a new DDD Feature (Full Stack: Deno + F# + C#)
variables:
  - name: featureName
    description: The name of the feature (e.g., TurnOnLights)
    default: AskUser
  - name: targetApp
    description: Which micro-frontend is this for?
    default: AskUser
    options:
      - garage
      - garden
      - budget
      - flashcards
      - frontend

---

1. Ask the user for `featureName` and `targetApp` if not provided.

2. Determine the Deno root directory based on `{{targetApp}}` (e.g., `frontends/garage/` or `frontend/`).

3. Create the Deno Feature Structure:
   - Path: `[DenoRoot]/lib/features/{{featureName}}/schema.ts`
   - Content: Zod schema matching the expected F# types.
   - Path: `[DenoRoot]/lib/features/{{featureName}}/client.ts`
   - Content: Fetch client function that calls the C# API.
   - Path: `[DenoRoot]/lib/features/{{featureName}}/state.ts`
   - Content: Preact Signals for UI state.

4. Create the F# Contract (Public):
   - Path: `LifeOS.RulesEngine.FSharp/Contracts/I{{featureName}}RulesEngine.fs`
   - Context: Reference `LifeOS.RulesEngine.FSharp/Contracts/IRulesEngine.fs` for style.
   - Content: Define a C#-friendly interface and DTOs.

5. Create the F# Logic (Internal):
   - Path: `LifeOS.RulesEngine.FSharp/Internal/{{featureName}}Logic.fs`
   - Context: Reference `LifeOS.RulesEngine.FSharp/Internal/BudgetRulesEngine.fs` for pure logic patterns.
   - Content: Define internal Discriminated Unions and pure functions.

6. Create the F# Adapter (Implementation):
   - Path: `LifeOS.RulesEngine.FSharp/Adapters/{{featureName}}RulesEngine.fs`
   - Content: Implement the interface from Step 4 using the logic from Step 5.

7. Create the C# Controller (API):
   - Path: `LifeOS.API/Controllers/{{featureName}}Controller.cs`
   - Content: Create an ASP.NET Core controller that injects `I{{featureName}}RulesEngine`.