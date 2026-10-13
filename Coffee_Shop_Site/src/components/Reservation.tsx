import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import reservation from "../assets/images/reservation.png";
import { clearSubmissionIntent, prepareSubmission, submitReservation, SubmissionError } from "../services/reservations";
import { guestCounts, localDate, latestDate, formatDate, formatTime, parseDate, timeSlots, validateReservation } from "../utils/reservation";
import type { ReservationErrors, ReservationValues, SavedReservation } from "../utils/reservation";
import Button from "./Button";

const emptyValues: ReservationValues = { name: "", email: "", guests: "", date: "", time: "" };
const controlStyle = "w-full min-w-0 border-0 border-b pb-2 border-inputBorder bg-transparent font-Source text-lg text-secondary";

const Reservation = () => {
	const [values, setValues] = useState<ReservationValues>(emptyValues);
	const [errors, setErrors] = useState<ReservationErrors>({});
	const [now, setNow] = useState(() => new Date());
	const [confirmation, setConfirmation] = useState<SavedReservation | null>(null);
	const [website, setWebsite] = useState("");
	const [pending, setPending] = useState(false);
	const [submissionError, setSubmissionError] = useState("");
	const formRef = useRef<HTMLFormElement>(null);
	const submitting = useRef(false);
	const restartFocus = useRef(false);
	const confirmationHeading = useRef<HTMLHeadingElement>(null);
	const errorFocus = useRef<keyof ReservationValues | null>(null);

	useEffect(() => {
		const timer = window.setInterval(() => setNow(new Date()), 1000);
		return () => window.clearInterval(timer);
	}, []);

	useEffect(() => {
		if (confirmation) {
			confirmationHeading.current?.focus({ preventScroll: true });
		} else if (restartFocus.current) {
			formRef.current?.querySelector<HTMLInputElement>("input[name=name]")?.focus();
			restartFocus.current = false;
		}
	}, [confirmation]);

	useEffect(() => {
		if (!pending && errorFocus.current) {
			(formRef.current?.elements.namedItem(errorFocus.current) as HTMLElement | null)?.focus();
			errorFocus.current = null;
		}
	}, [errors, pending]);

	const slots = timeSlots(values.date, now);
	const noSlots = Boolean(parseDate(values.date)) && !slots.some((slot) => !slot.disabled);

	function change(field: keyof ReservationValues, value: string) {
		setNow(new Date());
		setValues((previous) => ({ ...previous, [field]: value, ...(field === "date" ? { time: "" } : {}) }));
		setErrors((previous) => ({ ...previous, [field]: undefined, ...(field === "date" ? { time: undefined } : {}) }));
		setSubmissionError("");
	}

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (submitting.current) return;
		submitting.current = true;
		setSubmissionError("");
		try {
			const current = new Date();
			setNow(current);
			const { intent, isRetry } = await prepareSubmission(values);
			// Validate unchanged retries against their original instant; the server
			// first checks whether that exact intent was already saved.
			const nextErrors = validateReservation(values, isRetry ? new Date(intent.intentCreatedAt) : current);
			const dateInput = formRef.current?.elements.namedItem("date") as HTMLInputElement | null;
			if (dateInput?.validity.badInput) nextErrors.date = "Enter a valid calendar date.";
			setErrors(nextErrors);
			const firstInvalid = (["name", "email", "guests", "date", "time"] as const).find((field) => nextErrors[field]);
			if (firstInvalid) {
				(formRef.current?.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
				return;
			}
			setPending(true);
			setConfirmation(await submitReservation(values, intent, website));
		} catch (error) {
			if (error instanceof SubmissionError) {
				setSubmissionError(error.message);
				if (error.fields) {
					setErrors(error.fields);
					const first = (["name", "email", "guests", "date", "time"] as const).find((field) => error.fields?.[field]);
					if (first) errorFocus.current = first;
				}
			} else setSubmissionError("We could not verify your request. Keep your details and retry.");
		} finally {
			submitting.current = false;
			setPending(false);
		}
	}

	function restart() {
		clearSubmissionIntent();
		setWebsite("");
		restartFocus.current = true;
		setValues({ ...emptyValues });
		setErrors({});
		setSubmissionError("");
		setNow(new Date());
		setConfirmation(null);
	}

	const confirmedDate = confirmation ? formatDate(confirmation.date) : "";
	const confirmedTime = confirmation ? formatTime(Number(confirmation.time.slice(0, 2)) * 60 + Number(confirmation.time.slice(3))) : "";

	return (
		<section data-entrance id="reservation" tabIndex={-1} aria-labelledby="reservation-heading" className="w-full flex lg:flex-row flex-col lg:items-stretch items-center my-[100px]">
			<img src={reservation} alt="Coffee shop seating" className="lg:w-1/2 w-full lg:object-cover lg:min-h-[710px]" />
			<div className="w-full lg:w-1/2 bg-backgrounds flex items-center justify-center flex-col p-8 lg:py-12">
				<div className="flex flex-col w-full max-w-[500px]">
					<h2 id="reservation-heading" className="uppercase text-[60px] sm:text-[80px] lg:text-[104px] tracking-wide font-Bebas text-text leading-tight break-words">reservation</h2>
					<p id="reservation-demo" className="font-Source text-lg font-light text-secondary mt-3">Make room for a little coffee and good company. Book a table for a quiet break or a catch-up with friends, we’ll save you a seat.</p>
					<div role="status" aria-live="polite" aria-atomic="true" className="font-Source text-secondary">
						{pending && <p>Submitting your reservation request…</p>}
						{confirmation && (
							<div className="mt-8">
								<h3 ref={confirmationHeading} tabIndex={-1} className="text-2xl font-semibold">Reservation request saved — pending</h3>
								<p className="mt-3">{confirmedDate} at {confirmedTime}, for {confirmation.guests} {confirmation.guests === 1 ? "guest" : "guests"} — Europe/Oslo.</p>
								<p className="mt-3">Reference: {confirmation.reference}</p>
								<p className="mt-3">This is a portfolio project for a fictional café. No real table reservation has been made. Availability has not been checked and no table is confirmed. No email has been sent.</p>
							</div>
						)}
					</div>
					{confirmation ? (
						<Button className="mt-8 max-w-full h-auto min-h-[47px] py-2" onClick={restart}>Make another request</Button>
					) : (
						<form ref={formRef} onSubmit={submit} noValidate aria-describedby="reservation-demo" aria-busy={pending} className="flex flex-col gap-5 mt-8">
							<div role="alert" aria-atomic="true" className="font-Source text-red-700">
								{Object.values(errors).some(Boolean) && <p><span aria-hidden="true">* </span>Please check the highlighted fields below.</p>}
								{submissionError && <p><span aria-hidden="true">* </span><span>{submissionError}</span></p>}
							</div>
							<div className="hidden" aria-hidden="true">
								<label htmlFor="reservation-website">Leave this field empty</label>
								<input id="reservation-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
							</div>
							<div>
								<label htmlFor="reservation-name" className="block font-Source font-bold text-secondary mb-2">Name (required)</label>
								<input id="reservation-name" name="name" type="text" autoComplete="name" required maxLength={100} disabled={pending} value={values.name} onChange={(event) => change("name", event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} className={controlStyle} />
								{errors.name && <p id="name-error" className="font-Source text-red-700 mt-2"><span aria-hidden="true">* </span>{errors.name}</p>}
							</div>
							<div>
								<label htmlFor="reservation-email" className="block font-Source font-bold text-secondary mb-2">Email (required)</label>
								<input id="reservation-email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={pending} value={values.email} onChange={(event) => change("email", event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} className={controlStyle} />
								{errors.email && <p id="email-error" className="font-Source text-red-700 mt-2"><span aria-hidden="true">* </span>{errors.email}</p>}
							</div>
							<div>
								<label htmlFor="reservation-guests" className="block font-Source font-bold text-secondary mb-2">Number of guests (required)</label>
								<select id="reservation-guests" name="guests" required disabled={pending} value={values.guests} onChange={(event) => change("guests", event.target.value)} aria-invalid={Boolean(errors.guests)} aria-describedby={errors.guests ? "guests-error" : undefined} className={controlStyle}>
									<option value="">Choose guests</option>
									{guestCounts.map((count) => <option key={count} value={count}>{count} {count === "1" ? "guest" : "guests"}</option>)}
								</select>
								{errors.guests && <p id="guests-error" className="font-Source text-red-700 mt-2"><span aria-hidden="true">* </span>{errors.guests}</p>}
							</div>
							<div>
								<label htmlFor="reservation-date" className="block font-Source font-bold text-secondary mb-2">Date — Europe/Oslo (required)</label>
								<input id="reservation-date" name="date" type="date" required disabled={pending} min={localDate(now)} max={latestDate(now)} value={values.date} onChange={(event) => change("date", event.target.value)} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? "date-error" : undefined} className={controlStyle} />
								{errors.date && <p id="date-error" className="font-Source text-red-700 mt-2"><span aria-hidden="true">* </span>{errors.date}</p>}
							</div>
							<div>
								<label htmlFor="reservation-time" className="block font-Source font-bold text-secondary mb-2">Time — Europe/Oslo (required)</label>
								<select id="reservation-time" name="time" required disabled={pending} value={values.time} onChange={(event) => change("time", event.target.value)} aria-invalid={Boolean(errors.time)} aria-describedby={`time-help${errors.time ? " time-error" : ""}`} className={controlStyle}>
									<option value="">Choose time</option>
									{slots.map((slot) => <option key={slot.value} value={slot.value} disabled={slot.disabled}>{slot.label}{slot.disabled ? " (passed)" : ""}</option>)}
								</select>
								<p id="time-help" className="font-Source text-secondary mt-2">{noSlots ? "No future times are available for this date. Choose another date." : "All dates and times are in Europe/Oslo. Mon–Fri: 10 am–7 pm; Sat–Sun: noon–6 pm. Last arrival is 30 minutes before closing."}</p>
								{errors.time && <p id="time-error" className="font-Source text-red-700 mt-2"><span aria-hidden="true">* </span>{errors.time}</p>}
							</div>
							<Button type="submit" disabled={pending} className="mt-3">{pending ? "Submitting…" : "Book a table"}</Button>
						</form>
					)}
				</div>
			</div>
		</section>
	);
};

export default Reservation;
