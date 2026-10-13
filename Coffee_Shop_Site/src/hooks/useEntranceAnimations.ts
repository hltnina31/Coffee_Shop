import { useEffect } from "react";
import type { RefObject } from "react";

export function useEntranceAnimations(pageRef: RefObject<HTMLDivElement | null>) {
	useEffect(() => {
		const page = pageRef.current;
		if (!page || typeof IntersectionObserver === "undefined" || typeof window.matchMedia !== "function") return;

		let observer: IntersectionObserver | undefined;
		let motion: MediaQueryList | undefined;
		const targets = Array.from(page.querySelectorAll<HTMLElement>("[data-entrance]"));

		function finish(target: HTMLElement) {
			target.dataset.entranceSeen = "true";
			target.classList.remove("entrance-running");
			observer?.unobserve(target);
		}

		function reveal(target: HTMLElement) {
			if (target.dataset.entranceSeen) return;
			target.dataset.entranceSeen = "true";
			observer?.unobserve(target);
			if (!motion?.matches && !target.contains(document.activeElement)) {
				target.classList.add("entrance-running");
			}
		}

		function onFocus(event: FocusEvent) {
			if (!(event.target instanceof Element)) return;
			const target = event.target.closest<HTMLElement>("[data-entrance]");
			if (target && page?.contains(target)) finish(target);
		}

		function onAnimationEnd(event: AnimationEvent) {
			if (event.animationName === "entrance" && event.target instanceof HTMLElement) {
				event.target.classList.remove("entrance-running");
			}
		}

		function onMotionChange() {
			if (motion?.matches) {
				targets.forEach(finish);
				observer?.disconnect();
			}
		}

		try {
			motion = window.matchMedia("(prefers-reduced-motion: reduce)");
			page.addEventListener("focusin", onFocus);
			page.addEventListener("animationend", onAnimationEnd);
			motion.addEventListener("change", onMotionChange);
			if (motion.matches) {
				targets.forEach(finish);
			} else {
				observer = new IntersectionObserver((entries) => {
					try {
						for (const entry of entries) {
							if (entry.isIntersecting) reveal(entry.target as HTMLElement);
						}
					} catch {
						targets.forEach(finish);
						observer?.disconnect();
					}
				}, { threshold: 0 });
				for (const target of targets) {
					if (!target.dataset.entranceSeen) observer.observe(target);
				}
			}
		} catch {
			targets.forEach(finish);
			observer?.disconnect();
		}

		return () => {
			observer?.disconnect();
			page.removeEventListener("focusin", onFocus);
			page.removeEventListener("animationend", onAnimationEnd);
			motion?.removeEventListener("change", onMotionChange);
			targets.forEach((target) => target.classList.remove("entrance-running"));
		};
	}, [pageRef]);
}
