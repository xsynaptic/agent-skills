export interface ModelClaims {
  findings: { isTemporal?: boolean; rule: string }[];
  holds: string[];
  mutants: { mutant: string; replace: string; rule: string }[];
  properties: string[];
}

export const claims = {} satisfies Record<string, ModelClaims>;
