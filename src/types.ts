export interface SubItem {
  id: string;
  text: string;
  type: 'checkbox' | 'list';
  checked: boolean;
  subs: SubItem[];
}

export interface Goal {
  id: string;
  text: string;
  checked: boolean;
  subs: SubItem[];
}

export type GoalData = Record<string, Goal[]>;
