import Image from "next/image";
import olivo from "../imagenes/olivo.jpg";
import OlivosSection from "./OlivosSection";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <main className={styles.hero}>
        <p className={styles.eyebrow}>Tradición mediterránea</p>
        <h1 className={styles.title}>Adopta un olivo</h1>

        <div className={styles.visualBlock}>
          <Image
            src={olivo}
            alt="Olivo maduro en un campo mediterráneo"
            priority
            className={styles.image}
          />
          <p className={styles.explicacion}>
            Somos una empresa y nuestro objetivo es ofrecer la adopción de olivos para todas aquellas personas que lo deseen.
          </p>
        </div>
      </main>

      <section className={styles.adopcionSection}>
        <video
          className={styles.adopcionVideo}
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/videos/14506-257440791_medium.webm" type="video/webm" />
          <source src="/videos/14506-257440791_medium.mp4" type="video/mp4" />
        </video>

        <div className={styles.adopcionContent}>
          <p className={styles.adopcionText}>
            Adoptas un olivo real de nuestro campo. Nosotros lo cuidamos todo el año y tú formas parte de su historia y cosecha.
          </p>
        </div>
      </section>

      <OlivosSection />
    </>
  );
}
