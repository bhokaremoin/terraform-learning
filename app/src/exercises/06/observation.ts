import type { ObservationSpec } from '../../lib/validator-types';

export const observation: ObservationSpec = {
  why:
    'This exercise teaches the difference between in-place updates (~) and full replacements (-/+). The only authoritative answer is `terraform plan` output — provider behavior can change between versions, so the lesson is about reading the plan carefully.',
  checklist: [
    {
      label: 'Apply the starter (random_pet + local_file). Baseline established.',
    },
    {
      label: 'Change `local_file.content`, run plan. Note whether it shows ~ (in-place) or -/+ (replacement).',
      hint: 'Read the line about "forces replacement" if you see -/+. With current hashicorp/local, content updates in place.',
    },
    {
      label: 'Change `random_pet.length` from 2 to 3. Run plan. Identify the cascading replacement.',
      hint: 'random_pet.length is ForceNew → pet replaces. local_file.filename interpolates the pet → filename changes → local_file replaces too.',
    },
    {
      label: 'Change `local_file.filename` to a different path. Run plan. Confirm -/+ replacement.',
    },
    {
      label: 'Try `terraform apply -replace=local_file.greeting` with no code changes. Observe what plan proposes.',
      hint: 'This is the modern replacement for the deprecated `terraform taint`.',
    },
    {
      label: 'Run `terraform destroy` to clean up.',
    },
  ],
};
