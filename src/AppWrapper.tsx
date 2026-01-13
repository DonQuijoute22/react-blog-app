import { Provider } from "react-redux";
import { store } from "./store/store";
import App from "./App";

export default function AppWrapper() {
  return (
    <Provider store={store}>
      <App />
    </Provider>
  );
}
