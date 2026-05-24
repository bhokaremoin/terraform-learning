import type { ObservationSpec } from '../../lib/validator-types';

export const observation: ObservationSpec = {
  why:
    'This exercise teaches drift detection — the lesson is what `terraform plan` does when you change a managed file by hand. The web app can guide you through the steps, but only the terraform CLI can actually show you the drift. Note: with `local_file` specifically, an edit and a delete look identical, because the resource\'s id is the SHA1 of its content.',
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
      label: 'I ran `terraform plan` and saw Plan: 1 to add, 0 to change, 0 to destroy (a + create).',
      hint: 'With local_file, drift looks like a fresh create because the resource id = sha1(content). Refresh sees the SHA1 doesn\'t match and treats the original as gone.',
    },
    {
      label: 'I ran `terraform plan -refresh-only` and saw "Objects have changed outside of Terraform" calling out the drift.',
      hint: 'The refresh-only plan labels the resource "has been deleted" — even though you only edited it. Same root cause: identity is derived from content.',
    },
    {
      label: 'I ran `terraform apply` and watched the file restored to match my code.',
    },
    {
      label: 'I deleted managed.txt with `rm`, ran plan again, and saw the same shape: + create.',
      hint: 'Edit and delete produce identical plans with this provider. With most cloud providers the edit case would show ~ update in place instead.',
    },
    {
      label: 'I ran `terraform destroy` to clean up.',
    },
  ],
};
