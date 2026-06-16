export interface ClientInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export type ClientSelection =
  | { kind: "new"; data: ClientInput }
  | { kind: "existing"; id: string }
  | { kind: "skip" };
