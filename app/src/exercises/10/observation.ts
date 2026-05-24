import type { ObservationSpec } from '../../lib/validator-types';

export const observation: ObservationSpec = {
  why:
    'State commands (mv, rm, import) are surgical operations on terraform.tfstate. You can\'t practice them without actually running terraform CLI — the file changes are the lesson. The web app provides the script; you run it. Note: import is provider-specific. `local_file` does not support it, so the import section uses `random_integer` instead.',
  checklist: [
    {
      label: 'Apply the starter and confirm `terraform state list` shows local_file.alpha/beta/gamma.',
    },
    {
      label: 'Rename `local_file.alpha` to `local_file.first` in code; observe plan proposes destroy+create.',
      hint: 'State sees the old address vanish and a new one appear; it doesn\'t know they\'re the same.',
    },
    {
      label: 'Run `terraform state mv local_file.alpha local_file.first`. Plan now reports "No changes".',
    },
    {
      label: 'Run `terraform state rm local_file.beta`. The file stays on disk; state forgets it.',
    },
    {
      label: 'Add a `random_integer "adopted"` block (min=1, max=100) and import an existing value: `terraform import random_integer.adopted "42,1,100"`.',
      hint: 'Import IDs are provider-specific. random_integer uses the composite `result,min,max`. Heads-up: `terraform import local_file.x ...` returns "Resource Import Not Implemented" — that resource doesn\'t support import.',
    },
    {
      label: 'Run plan and confirm it shows "No changes" after the import.',
    },
    {
      label: 'Run `terraform destroy` to clean up.',
    },
  ],
};
