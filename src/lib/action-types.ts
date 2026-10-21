export interface ActionState {
  message: string;
  errors?: Record<string, string[] | undefined>;
  sent?: boolean;
  success?: boolean;
}
export const initialState: ActionState = { message: "" };
