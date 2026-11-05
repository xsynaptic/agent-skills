export interface ModelClaims {
  findings: string[];
  holds: string[];
  mutants: { mutant: string; replace: string; rule: string }[];
  properties: string[];
}

export const claims = {} satisfies Record<string, ModelClaims>;
