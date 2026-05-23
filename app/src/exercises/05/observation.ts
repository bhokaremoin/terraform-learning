import type { ObservationSpec } from '../../lib/validator-types';

export const observation: ObservationSpec = {
  why:
    'This exercise teaches drift detection — the lesson is what `terraform plan` does when you change a managed file by hand. The web app can guide you through the steps, but only the terraform CLI can actually show you the drift.',
  checklist: [
    {
      label: 'I ran `terraform init` and `terraform apply` and saw managed.txt created.',
      hint: 'Use the starter main.tf in this exercise. After apply, `cat managed.txt` should print "Managed by Terraform".',
    },
    {
      label: 'I hand-edited managed.txt to different content.',
      hint: 'e.g., `echo "I did this by hand" > managed.txt`.',
    },
    {
      label: 'I ran `terraform plan` and saw the "Objects have changed outside of Terraform" notice.',
      hint: 'The plan output shows a ~ (update in place) for local_file.managed.',
    },
    {
      label: 'I ran `terraform apply` and watched the file restored to match my code.',
    },
    {
      label: 'I deleted managed.txt with `rm`, ran plan again, and saw it propose to CREATE (not update).',
      hint: 'Different state-vs-reality story: state has no record because refresh updated it; code says it should exist.',
    },
    {
      label: 'I ran `terraform destroy` to clean up.',
    },
  ],
};
