---
auto_execution_mode: 1
---
description: Scaffolds a new Domain (Bounded Context) in the Monolith
variables:
  - name: domainName
    description: Name of the new Domain (e.g., Inventory, People)
    default: AskUser

---

1. Ask the user for the `domainName` if not provided.

2. Create the Frontend Skeleton:
   - Action: Initialize a new Fresh project using `deno run -Ar jsr:@fresh/init frontends/{{domainName}}`.
   - Action: Copy `frontends/garage/Containerfile` to `frontends/{{domainName}}/Containerfile`.
   - Instruction: "In this new project, mirroring the structure of `frontends/garage`."

3. Create the F# Domain Contract (The API):
   - Path: `LifeOS.RulesEngine.FSharp/Contracts/{{domainName}}Types.fs`
   - Context: Read `LifeOS.RulesEngine.FSharp/Contracts/BudgetTypes.fs` to understand the pattern.
   - Content: Define the interface `I{{domainName}}RulesEngine` and the DTOs (Data Transfer Objects) for this domain.

4. Create the F# Domain Logic (The Brain):
   - Path: `LifeOS.RulesEngine.FSharp/Internal/{{domainName}}Logic.fs`
   - Context: Read `LifeOS.RulesEngine.FSharp/Internal/BudgetRulesEngine.fs` (specifically the `BudgetLogic` module).
   - Content: Create a `module internal {{domainName}}Logic` with pure functions and internal types (Discriminated Unions).

5. Create the F# Adapter (The Wiring):
   - Path: `LifeOS.RulesEngine.FSharp/Adapters/{{domainName}}RulesEngine.fs`
   - Content: Create a class that implements `I{{domainName}}RulesEngine`, wrapping the pure logic from step 4.

6. Final Instructions:
   - Remind the user: "I have created the files. Please remember to:"
     1. Add the new service to `Program.cs` (DI Container).
     2. Add the new frontend to `Caddyfile`.
     3. Add the new frontend to `docker-compose.yml`.