"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import imagesImage from "../imagenes/images.webp";
import fuenteImage from "../imagenes/la-fuente-del-olivo-de-la-mezquita-de-cc3b3rdoba.jpg";
import olivoCaminoImage from "../imagenes/olivo-y-camino-458226438.webp";
import styles from "./olivos.module.css";

const olivos = [
  {
    nombre: "Olivo del Camino",
    variedad: "Picual",
    edad: "78 años",
    ubicacion: "Sector Norte · Jaén",
    diasEntreVisitas: 35,
    imagen: olivoCaminoImage,
  },
  {
    nombre: "Olivo del Mirador",
    variedad: "Arbequina",
    edad: "42 años",
    ubicacion: "Sector Alto · Jaén",
    diasEntreVisitas: 30,
    imagen: imagesImage,
  },
  {
    nombre: "Olivo de la Fuente",
    variedad: "Hojiblanca",
    edad: "96 años",
    ubicacion: "Sector Central · Jaén",
    diasEntreVisitas: 28,
    imagen: fuenteImage,
  },
];

const careAlertDurationMs = 60 * 1000;
const apiMessageDurationMs = 5 * 1000;
const premiumUpdateIntervalDays = 7;
const monitoringApiBaseUrl = process.env.NEXT_PUBLIC_MONITOREO_API_URL ?? "http://localhost:3000";

type MonitoringRecord = {
  nombre?: unknown;
  nivel?: unknown;
  descripcion?: unknown;
};

type AdoptionType = "initial" | "premium" | "gift";

async function fetchMonitoringMessage(
  apiBaseUrl: string,
  resource: string,
  emptyMessage: string,
  errorMessage: string,
  signal: AbortSignal,
) {
  try {
    const response = await fetch(`${apiBaseUrl}/${resource}`, { signal });
    if (!response.ok) throw new Error(`Failed to fetch ${resource}`);

    const records: unknown = await response.json();
    const record = Array.isArray(records)
      ? records.find((item): item is MonitoringRecord => typeof item === "object" && item !== null)
      : undefined;
    const details = [record?.nombre, record?.nivel, record?.descripcion]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim());

    return details.length > 0 ? details.join(" · ") : emptyMessage;
  } catch {
    return signal.aborted ? null : errorMessage;
  }
}

function formatCountdown(milliseconds: number) {
  if (milliseconds <= 0) return "disponible para visitar";

  const totalSeconds = Math.ceil(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;


  return `${days} días, ${hours} horas, ${minutes} minutos y ${seconds} segundos`;
}

export default function OlivosSection() {
  const [alertVisible, setAlertVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [confirmedIndex, setConfirmedIndex] = useState<number | null>(null);
  const [adopterName, setAdopterName] = useState("");
  const [adoptionType, setAdoptionType] = useState<AdoptionType | null>(null);
  const [showFinalPhrase, setShowFinalPhrase] = useState(false);
  const [careAlertVisible, setCareAlertVisible] = useState(true);
  const [careAlertRegisteredAt, setCareAlertRegisteredAt] = useState<number | null>(null);
  const [apiAlertMessage, setApiAlertMessage] = useState<{ category: string; message: string } | null>(null);
  const [registeredVisitDeadlines, setRegisteredVisitDeadlines] = useState<Record<string, number>>({});
  const [visitDeadline, setVisitDeadline] = useState<number | null>(null);
  const [remainingMilliseconds, setRemainingMilliseconds] = useState<number | null>(null);
  const activeIndex = selectedIndex ?? 0;
  const selectedOlivo = olivos[activeIndex];
  const confirmedOlivo = confirmedIndex !== null ? olivos[confirmedIndex] : null;
  const currentMonth = new Date().getMonth();

  useEffect(() => {
    if (!alertVisible) return;

    const timeoutId = window.setTimeout(() => {
      setAlertVisible(false);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [alertVisible]);

  useEffect(() => {
    if (careAlertRegisteredAt === null) return;

    const remainingTime = Math.max(
      0,
      careAlertDurationMs - (Date.now() - careAlertRegisteredAt),
    );
    const timeoutId = window.setTimeout(() => {
      setCareAlertVisible(false);
    }, remainingTime);

    return () => window.clearTimeout(timeoutId);
  }, [careAlertRegisteredAt]);

  useEffect(() => {
    if (
      confirmedIndex !== 0
      || !showFinalPhrase
      || !adopterName.trim()
      || adoptionType !== "initial"
      || careAlertVisible
      || careAlertRegisteredAt === null
    ) {
      return;
    }

    const abortController = new AbortController();
    let messageTimeoutId: number | null = null;

    const showWeatherMessage = async () => {
      let message: string;

      try {
        const response = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=37.7796&longitude=-3.7849&current=temperature_2m,relative_humidity_2m,precipitation&timezone=Europe%2FMadrid",
          { signal: abortController.signal },
        );
        if (!response.ok) throw new Error("Weather request failed");

        const data = await response.json();
        const current = data.current as {
          temperature_2m?: number;
          relative_humidity_2m?: number;
          precipitation?: number;
        } | undefined;

        if (
          typeof current?.temperature_2m !== "number"
          || typeof current.relative_humidity_2m !== "number"
          || typeof current.precipitation !== "number"
        ) {
          throw new Error("Weather response is incomplete");
        }

        message = `Jaén: ${current.temperature_2m} °C, humedad ${current.relative_humidity_2m}% y precipitación ${current.precipitation} mm.`;
      } catch {
        if (abortController.signal.aborted) return;
        message = "No se pudo consultar la meteorología.";
      }

      if (abortController.signal.aborted) return;
      setApiAlertMessage({ category: "Meteorología", message });
      messageTimeoutId = window.setTimeout(() => {
        setApiAlertMessage(null);
      }, apiMessageDurationMs);
    };

    const showPestMessage = async () => {
      const message = await fetchMonitoringMessage(
        monitoringApiBaseUrl,
        "plagas",
        "No hay plagas registradas en la API.",
        "No se pudieron consultar las plagas.",
        abortController.signal,
      );
      if (message === null || abortController.signal.aborted) return;

      setApiAlertMessage({ category: "Plaga", message });
      messageTimeoutId = window.setTimeout(() => {
        void showWeatherMessage();
      }, apiMessageDurationMs);
    };

    const showDiseaseMessage = async () => {
      const message = await fetchMonitoringMessage(
        monitoringApiBaseUrl,
        "enfermedades",
        "No hay enfermedades registradas en la API.",
        "No se pudieron consultar las enfermedades.",
        abortController.signal,
      );
      if (message === null || abortController.signal.aborted) return;

      setApiAlertMessage({ category: "Enfermedad", message });
      messageTimeoutId = window.setTimeout(() => {
        void showPestMessage();
      }, apiMessageDurationMs);
    };

    void showDiseaseMessage();

    return () => {
      abortController.abort();
      if (messageTimeoutId !== null) window.clearTimeout(messageTimeoutId);
    };
  }, [adopterName, adoptionType, careAlertRegisteredAt, careAlertVisible, confirmedIndex, showFinalPhrase]);

  useEffect(() => {
    if (
      confirmedIndex !== 2
      || !showFinalPhrase
      || !adopterName.trim()
      || adoptionType !== "initial"
      || careAlertVisible
      || careAlertRegisteredAt === null
    ) {
      return;
    }

    const abortController = new AbortController();
    let messageTimeoutId: number | null = null;

    const showPestMessage = async () => {
      const message = await fetchMonitoringMessage(
        monitoringApiBaseUrl,
        "plagas",
        "No hay plagas registradas en la API.",
        "No se pudieron consultar las plagas.",
        abortController.signal,
      );
      if (message === null || abortController.signal.aborted) return;

      setApiAlertMessage({ category: "Plaga", message });
      messageTimeoutId = window.setTimeout(() => {
        setApiAlertMessage(null);
      }, apiMessageDurationMs);
    };

    const showIrrigationMessage = async () => {
      let message: string;

      try {
        const response = await fetch("/api/irrigation", { signal: abortController.signal });
        if (!response.ok) throw new Error("Irrigation request failed");

        const data: unknown = await response.json();
        const soilData = typeof data === "object" && data !== null
          ? data as { moisture?: unknown }
          : undefined;
        if (typeof soilData?.moisture !== "number") {
          throw new Error("Irrigation response is incomplete");
        }

        message = `Humedad actual del suelo: ${(soilData.moisture * 100).toFixed(1)}%.`;
      } catch {
        if (abortController.signal.aborted) return;
        message = "No se pudo consultar el estado del riego.";
      }

      if (abortController.signal.aborted) return;
      setApiAlertMessage({ category: "Riego", message });
      messageTimeoutId = window.setTimeout(() => {
        void showPestMessage();
      }, apiMessageDurationMs);
    };

    void showIrrigationMessage();

    return () => {
      abortController.abort();
      if (messageTimeoutId !== null) window.clearTimeout(messageTimeoutId);
    };
  }, [adopterName, adoptionType, careAlertRegisteredAt, careAlertVisible, confirmedIndex, showFinalPhrase]);

  useEffect(() => {
    if (visitDeadline === null) return;

    const updateRemainingTime = () => {
      setRemainingMilliseconds(Math.max(0, visitDeadline - Date.now()));
    };

    updateRemainingTime();
    const intervalId = window.setInterval(updateRemainingTime, 1000);

    return () => window.clearInterval(intervalId);
  }, [visitDeadline]);

  const resetOlivoRegistration = () => {
    setAdopterName("");
    setAdoptionType(null);
    setShowFinalPhrase(false);
    setAlertVisible(false);
    setCareAlertVisible(false);
    setCareAlertRegisteredAt(null);
    setApiAlertMessage(null);
    setVisitDeadline(null);
    setRemainingMilliseconds(null);
  };

  const handleSelectOlivo = (index: number) => {
    if (confirmedIndex !== null && index !== confirmedIndex) {
      setConfirmedIndex(null);
      resetOlivoRegistration();
    }

    setSelectedIndex(index);
  };

  const handleChooseOlivo = (index: number) => {
    resetOlivoRegistration();
    setSelectedIndex(index);
    setConfirmedIndex(index);
  };

  const handleConfirmName = () => {
    const nameKey = adopterName.trim().replace(/\s+/g, " ").normalize("NFC").toLocaleLowerCase("es");
    if (!nameKey) return;

    const registeredOlivo = confirmedOlivo ?? selectedOlivo;
    const registrationKey = `${nameKey}:${registeredOlivo.nombre}`;
    const registeredAt = Date.now();
    const deadline = registeredVisitDeadlines[registrationKey]
      ?? registeredAt + registeredOlivo.diasEntreVisitas * 24 * 60 * 60 * 1000;
    if (registeredVisitDeadlines[registrationKey] === undefined) {
      setRegisteredVisitDeadlines((deadlines) => ({ ...deadlines, [registrationKey]: deadline }));
    }

    setCareAlertVisible(true);
    setCareAlertRegisteredAt(registeredAt);
    setVisitDeadline(deadline);
    setRemainingMilliseconds(Math.max(0, deadline - Date.now()));
    setShowFinalPhrase(true);
    setAlertVisible(true);
  };

  const careAlertContent = (
    <>
      <p className={styles.statusLabel}>Evento importante</p>
      <h5 className={styles.eventTitle}>Cuidado del olivo</h5>
      <div className={styles.eventImageWrap}>
        <Image
          className={styles.eventImage}
          src={selectedOlivo.imagen}
          alt={`Evento importante en ${selectedOlivo.nombre}`}
          sizes="(max-width: 760px) 100vw, 32vw"
        />
      </div>
      <p className={styles.eventCaption}>
        El árbol ha recibido atención especial en la temporada actual.
      </p>
    </>
  );
  const registrationAlertContent = (
    <Alert className={styles.statusAlert}>
      <AlertTitle>Alerta</AlertTitle>
      <AlertDescription>
        El olivo está en un estado exitoso y requiere revisión de cuidado.
      </AlertDescription>
    </Alert>
  );
  const apiAlertContent = apiAlertMessage ? (
    <>
      <p className={styles.statusLabel}>{apiAlertMessage.category}</p>
      <p className={styles.visitText}>{apiAlertMessage.message}</p>
    </>
  ) : null;
  const activeStatusMessages = [
    careAlertVisible ? careAlertContent : null,
    alertVisible ? registrationAlertContent : null,
    apiAlertContent,
  ].filter((message) => message !== null);

  return (
    <>
      <section className={styles.section} aria-labelledby="olivos-title">
      <video
        className={styles.backgroundVideo}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        <source
          src="/videos/20606524-uhd_3840_2160_24fps.webm"
          type="video/webm"
        />
        <source
          src="/videos/20606524-uhd_3840_2160_24fps.mp4"
          type="video/mp4"
        />
      </video>
      <div className={styles.inner}>
        <div className={styles.intro}>
          <div className={styles.messagePanel}>
            <p className={styles.eyebrow}>Un árbol, una historia</p>
            <p className={styles.description}>
              Cada árbol tiene su carácter. Descubre el que te acompañará en cada
              cosecha.
            </p>
            <p id="olivos-title">
              <span className={styles.selectionPrompt}>Elige tu olivo:</span>
            </p>
          </div>
        </div>

        <nav className={styles.selector} aria-label="Seleccionar olivo">
          {olivos.map((olivo, index) => (
            <button
              className={styles.option}
              type="button"
              key={olivo.nombre}
              aria-pressed={selectedIndex === index}
              onClick={() => handleSelectOlivo(index)}
            >
              <span className={styles.optionNumber}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.optionName}>{olivo.nombre}</span>
              <span className={styles.optionVariety}>{olivo.variedad}</span>
            </button>
          ))}
        </nav>

        <div className={styles.details} aria-live="polite">
          <div className={styles.infoContainer}>
            <div className={styles.info}>
              <p className={styles.infoEyebrow}>Tu árbol</p>
              <h3 className={styles.name}>{selectedOlivo.nombre}</h3>
              <dl className={styles.facts}>
                <div className={styles.fact}>
                  <dt>Variedad</dt>
                  <dd>{selectedOlivo.variedad}</dd>
                </div>
                <div className={styles.fact}>
                  <dt>Edad</dt>
                  <dd>{selectedOlivo.edad}</dd>
                </div>
                <div className={styles.fact}>
                  <dt>Ubicación</dt>
                  <dd>{selectedOlivo.ubicacion}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className={styles.photoColumn}>
            <div className={styles.photoFrame}>
              <Image
                className={styles.photo}
                src={selectedOlivo.imagen}
                alt={`Olivo ${selectedOlivo.nombre} en la finca`}
                sizes="(max-width: 760px) 100vw, 52vw"
              />
              <span className={styles.photoIndex}>
                {String(activeIndex + 1).padStart(2, "0")} / {olivos.length}
              </span>
            </div>
            <button
              type="button"
              className={styles.choiceButton}
              onClick={() => handleChooseOlivo(activeIndex)}
            >
              Elige este olivo
            </button>
          </div>
        </div>

        {confirmedOlivo && (
          <section className={styles.confirmationSection} aria-live="polite">
            <p className={styles.confirmationEyebrow}>Olivo registrado</p>
            <h4 className={styles.confirmationTitle}>{confirmedOlivo.nombre}</h4>
            <div className={styles.adopterNameEntry}>
              <label className={styles.adopterNameField}>
                <span>Introduce tu nombre</span>
                <input
                  type="text"
                  name="adopterName"
                  autoComplete="name"
                  maxLength={80}
                  value={adopterName}
                  onChange={(event) => {
                    setAdopterName(event.target.value);
                    setAdoptionType(null);
                    setApiAlertMessage(null);
                    setShowFinalPhrase(false);
                  }}
                  placeholder="Escribe tu nombre"
                />
              </label>
              <button
                type="button"
                className={styles.nameConfirmButton}
                disabled={!adopterName.trim()}
                onClick={handleConfirmName}
              >
                Confirmar
              </button>
            </div>
            {showFinalPhrase && adopterName.trim() && (
              <p className={styles.confirmationText}>
                {confirmedOlivo.nombre === "Olivo del Camino"
                  || confirmedOlivo.nombre === "Olivo del Mirador"
                  || confirmedOlivo.nombre === "Olivo de la Fuente"
                  ? <>
                      {adopterName.trim()} podrá visitar el olivo cada {confirmedOlivo.diasEntreVisitas} días.
                    </>
                  : `¡Gracias, ${adopterName.trim()}! El ${confirmedOlivo.nombre}, variedad ${confirmedOlivo.variedad}, ya forma parte de tu adopción.`}
              </p>
            )}
          </section>
        )}

        {confirmedOlivo && showFinalPhrase && adopterName.trim() && (
          <section className={styles.adoptionTypeSection} aria-labelledby="adoption-type-title">
            <h4 className={styles.adoptionTypeTitle} id="adoption-type-title">
              Elige el tipo de adopción
            </h4>
            <div className={styles.adoptionTypeOptions} role="group" aria-labelledby="adoption-type-title">
              <button
                className={styles.adoptionTypeOption}
                type="button"
                aria-pressed={adoptionType === "initial"}
                onClick={() => setAdoptionType("initial")}
              >
                Adopción inicial
              </button>
              <button
                className={styles.adoptionTypeOption}
                type="button"
                aria-pressed={adoptionType === "premium"}
                onClick={() => {
                  setAdoptionType("premium");
                  setApiAlertMessage(null);
                }}
              >
                Adopción premium
              </button>
              <button
                className={styles.adoptionTypeOption}
                type="button"
                aria-pressed={adoptionType === "gift"}
                onClick={() => {
                  setAdoptionType("gift");
                  setApiAlertMessage(null);
                }}
              >
                Adopción regalo
              </button>
            </div>
          </section>
        )}
      </div>
    </section>

    {confirmedOlivo && showFinalPhrase && adopterName.trim() && adoptionType === "premium" && (
      <section className={styles.premiumSection} aria-labelledby="premium-title">
        <Image
          className={styles.premiumVideo}
          src="/videos/olivo_premium.webp"
          alt=""
          width={640}
          height={1120}
          unoptimized
          aria-hidden="true"
        />
        <div className={styles.premiumContent}>
          <header className={styles.premiumHeader}>
            <p className={styles.adopcionEyebrow}>Adopción premium</p>
            <h4 className={styles.premiumTitle} id="premium-title">
              Beneficios para {confirmedOlivo.nombre}
            </h4>
          </header>

          <div className={styles.premiumTimeline}>
            <article className={styles.premiumTimelineItem}>
              <p className={styles.premiumTiming}>Después de la cosecha</p>
              <div>
                <h5 className={`${styles.premiumItemTitle} ${styles.premiumOilTitle}`}>
                  Aceite de {confirmedOlivo.nombre}
                </h5>
                <p className={styles.premiumItemDescription}>
                  La cantidad se confirmará al finalizar la cosecha.
                </p>
              </div>
            </article>

            <article className={styles.premiumTimelineItem}>
              <p className={styles.premiumTiming}>Cada {premiumUpdateIntervalDays} días</p>
              <div>
                <h5 className={styles.premiumItemTitle}>Estado de {confirmedOlivo.nombre}</h5>
                <p className={styles.premiumItemDescription}>
                  Recibirás fotos o mensajes sobre el estado de tu olivo.
                </p>
              </div>
            </article>

            <article className={styles.premiumTimelineItem}>
              <p className={styles.premiumTiming}>Cada {confirmedOlivo.diasEntreVisitas} días</p>
              <div>
                <h5 className={styles.premiumItemTitle}>Invitación para visitar {confirmedOlivo.nombre}</h5>
                <p className={styles.premiumItemDescription}>
                  Recibirás una invitación vinculada a este olivo.
                </p>
              </div>
            </article>

            <article className={styles.premiumTimelineItem} aria-live="polite">
              <p className={styles.premiumTiming}>Próxima invitación</p>
              <div>
                <h5 className={styles.premiumItemTitle}>{confirmedOlivo.nombre}</h5>
                <p className={styles.premiumItemDescription}>
                  {remainingMilliseconds === null
                    ? "Comprobando disponibilidad..."
                    : remainingMilliseconds === 0
                      ? "La invitación está disponible."
                      : formatCountdown(remainingMilliseconds)}
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>
    )}

    {confirmedOlivo && showFinalPhrase && adopterName.trim() && adoptionType === "gift" && (
      <section className={styles.giftSection} aria-labelledby="gift-title">
        <header className={styles.giftHeader}>
          <p className={styles.giftEyebrow}>Adopción regalo</p>
          <h4 className={styles.giftTitle} id="gift-title">Un olivo para celebrar</h4>
        </header>

        <dl className={styles.giftDetails}>
          <div className={styles.giftField}>
            <dt className={styles.giftLabel}>Destinatario</dt>
            <dd className={styles.giftValue}>Regalo para: {adopterName.trim()}</dd>
          </div>
          <div className={styles.giftField}>
            <dt className={styles.giftLabel}>Mensaje de felicitación</dt>
            <dd className={styles.giftValue}>¡Felicidades, {adopterName.trim()}!</dd>
          </div>
          <div className={styles.giftField}>
            <dt className={styles.giftLabel}>Descripción del regalo</dt>
            <dd className={styles.giftValue}>
              Aquí tiene su donación: el olivo {confirmedOlivo.nombre}, con el cual podrá extraer
              el mejor aceite que jamás haya probado. ¡Enhorabuena, {adopterName.trim()}!
            </dd>
          </div>
          <div className={styles.giftField}>
            <dt className={styles.giftLabel}>Mensajes y avisos</dt>
            <dd className={styles.giftValue}>
              Cada {confirmedOlivo.diasEntreVisitas} días recibirá un mensaje para que conozca
              el estado del olivo.
            </dd>
          </div>
        </dl>
      </section>
    )}

    {confirmedOlivo && showFinalPhrase && adopterName.trim() && adoptionType === "initial" && (
      <section className={styles.statusSection} aria-live="polite">
        <video
          className={styles.statusBackgroundVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        >
          <source src="/videos/16679527_1920_1080_60fps.mp4" type="video/mp4" />
        </video>

        <div className={styles.statusHeader}>
          <p className={styles.statusEyebrow}>Avisos del olivo</p>
          <h4 className={styles.statusTitle}>Seguimiento de tu árbol</h4>
        </div>

        <div className={styles.statusGrid}>
          <div className={styles.statusCard}>
            {activeStatusMessages[0] ?? (
              <p className={styles.statusEmptyMessage}>Sin mensajes</p>
            )}
          </div>

          <div className={styles.statusCard}>
            {showFinalPhrase && adopterName.trim() ? (
              <>
              <p className={styles.statusLabel}>Horario de visita</p>
              <h5 className={styles.visitTitle}>Tu próxima visita</h5>
              <p className={styles.visitText}>
                {remainingMilliseconds === null
                  ? "Comprobando disponibilidad..."
                  : remainingMilliseconds === 0
                    ? "Ya puedes visitar el olivo hoy."
                    : `Te corresponde volver en ${formatCountdown(remainingMilliseconds)}.`}
              </p>
              </>
            ) : (
              <p className={styles.statusEmptyMessage}>Sin mensajes</p>
            )}
          </div>

          <div className={styles.statusCard}>
            {activeStatusMessages[1] ?? (
              <p className={styles.statusEmptyMessage}>Sin mensajes</p>
            )}
          </div>
        </div>
      </section>
    )}
    </>
  );
}