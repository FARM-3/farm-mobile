/** In-memory session flag — resets on app cold start so QR/deep links land on Login. */
let sessionActive = false;

export const setSessionActive = (active) => {
  sessionActive = !!active;
};

export const isSessionActive = () => sessionActive;
