/**
 * Copy for the air ambulance pages (M11, W4-6). The emergency notice is
 * shown at the top of every air ambulance page and is never animated
 * (rule 7).
 */
export const AIR_AMBULANCE = {
  notice: {
    title: "For an immediate emergency, call 112",
    text: "Or call your local emergency services now. An air ambulance request is not an emergency response: our operations team and the operator verify every mission before it is confirmed.",
  },
  intro: {
    title: "Request an air ambulance",
    text: "Tell us about the patient and the journey. Our operations team checks feasibility with an approved air ambulance operator and sends you a quote. Nothing is confirmed until the mission is verified.",
  },
  steps: [
    "Send the request with the patient's medical details and any reports.",
    "Operations find an approved operator and check the mission is feasible.",
    "You receive a quote with its conditions, and accept or decline it.",
    "Operations confirm once every check is complete.",
  ],
  signIn: {
    text: "Sign in or create an account to send a request, so you can follow it and receive the quote.",
    action: "Sign in to request",
  },
  notCustomer:
    "Air ambulance requests are sent from a customer account. Sign in with one to send a request.",
} as const;
