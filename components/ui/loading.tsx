import { Icons } from "../icons";
import styles from "./loading.module.scss";

export default function Loading(props: { noLogo?: boolean }) {
  return (
    <div className={styles["loading-content"] + " no-dark"}>
      {!props.noLogo && <Icons.bot />}
      <Icons.threeDots />
    </div>
  );
}
