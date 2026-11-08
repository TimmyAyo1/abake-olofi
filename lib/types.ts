export type Stage = "enquiry" | "invoiced" | "deposit" | "weaving" | "ready" | "delivered";
export type Feeling = "loved" | "okay" | "unhappy";

export type Line = { desc: string; qty: number; unit: number; heading?: boolean }; // heading: section title (or a bold line if it has a price)
export type Media = { path: string; type: "image" | "video" };

export type Order = {
  id: string;
  ref: string;
  client_name: string;
  client_phone: string | null;
  source: string | null;
  title: string | null;
  specs: string | null;
  colourway: string | null;
  event_date: string | null;
  lines: Line[];
  other_costs: number;
  invoice_no: number | null;
  discount: number;
  deposit_due: number | null;
  bank_account_id: string | null;
  stage: Stage;
  cancelled: boolean;
  invoiced_at: string | null;
  deposit_at: string | null;
  weaving_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  weaver_id: string | null;
  weaver_cost: number | null;
  weaver_promised: string | null;
  client_promised: string | null;
  client_date_note: string | null;
  next_call: string | null;
  last_call: string | null;
  cover_path: string | null;
  track_token: string;
  feedback_product: Feeling | null;
  feedback_service: Feeling | null;
  feedback_better: string | null;
  feedback_public: string | null;
  feedback_share: boolean | null;
  feedback_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderUpdate = {
  id: string;
  order_id: string;
  kind: "weaver" | "client" | "note" | "stage" | "payment";
  body: string | null;
  media: Media[];
  shared: boolean;
  created_at: string;
};

export type Payment = {
  id: string;
  order_id: string;
  direction: "in" | "out";
  amount: number;
  paid_on: string;
  kind: string | null;
  proof_path: string | null;
  created_at: string;
};

export type Weaver = { id: string; name: string; phone: string | null; active?: boolean };

export type Template = {
  id: string;
  name: string;
  specs: string | null;
  lines: Line[];
  weaver_cost: number | null;
  weeks: number | null;
};

export type Settings = {
  id: number;
  biz_name: string;
  address: string | null;
  phone: string | null;
  handle: string | null;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  terms: string | null;
  buffer_days: number;
  call_every_days: number;
  next_invoice_no: number;
};

/** An order with its weaver and payments joined in. */
export type OrderFull = Order & {
  weaver: Weaver | null;
  payments: Payment[];
};

export type Bank = { id: string; bank_name: string; account_name: string | null; account_number: string; is_default: boolean };
