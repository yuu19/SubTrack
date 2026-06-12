<script lang="ts" module>
	export type LandingMotionDemoVariant = 'hero' | 'add' | 'notification' | 'analytics' | 'ticker';
</script>

<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import type { LandingMotionDemoCopy } from '$lib/content/site-content';
	import { cn } from '$lib/utils';
	import {
		Bell,
		CalendarDays,
		Check,
		CircleDollarSign,
		CreditCard,
		MousePointer2,
		Plus,
		WalletCards
	} from 'lucide-svelte';

	type Props = {
		copy: LandingMotionDemoCopy;
		variant?: LandingMotionDemoVariant;
		class?: string;
	};

	let { copy, variant = 'hero', class: className }: Props = $props();

	const tickerRepeats = [0, 1] as const;
	const segmentColors = ['var(--primary)', '#22c55e', '#f97316', '#3b82f6'];
	const ariaLabel = $derived(copy[variant].ariaLabel);
	const analyticsSegments = $derived.by(() => {
		let offset = 0;

		return copy.analytics.items.map((item, index) => {
			const segment = {
				...item,
				color: segmentColors[index % segmentColors.length],
				offset
			};

			offset += item.share;
			return segment;
		});
	});
</script>

<div class={cn('lp-demo', `lp-demo-${variant}`, className)} role="img" aria-label={ariaLabel}>
	<div aria-hidden="true">
		{#if variant === 'hero'}
			<div class="lp-demo-browser">
				<div class="lp-demo-chrome">
					<div class="lp-demo-dots">
						<span></span>
						<span></span>
						<span></span>
					</div>
					<span class="lp-demo-window-title">{copy.hero.windowTitle}</span>
				</div>

				<div class="lp-demo-hero-grid">
					<div class="lp-demo-total-card">
						<div class="lp-demo-card-heading">
							<WalletCards class="size-4" />
							<span>{copy.hero.totalLabel}</span>
						</div>
						<div class="lp-demo-total-value" aria-hidden="true">
							<span class="lp-demo-total-before">{copy.hero.totalBefore}</span>
							<span class="lp-demo-total-after">{copy.hero.totalAfter}</span>
						</div>
						<p>{copy.hero.totalHint}</p>
					</div>

					<div class="lp-demo-next-card">
						<div class="lp-demo-card-heading">
							<CalendarDays class="size-4" />
							<span>{copy.hero.nextBillLabel}</span>
						</div>
						<div class="lp-demo-next-service">{copy.hero.nextBillService}</div>
						<div class="lp-demo-next-meta">
							<span>{copy.hero.nextBillDate}</span>
							<strong>{copy.hero.nextBillAmount}</strong>
						</div>
					</div>

					<div class="lp-demo-notice-card">
						<div class="lp-demo-icon-ring">
							<Bell class="size-4" />
						</div>
						<div>
							<strong>{copy.hero.notificationTitle}</strong>
							<span>{copy.hero.notificationBody}</span>
						</div>
					</div>

					<div class="lp-demo-calendar-card">
						<div class="lp-demo-card-heading">
							<CreditCard class="size-4" />
							<span>{copy.hero.calendarTitle}</span>
						</div>
						<div class="lp-demo-calendar-list">
							{#each copy.hero.calendarItems as item (item)}
								<span>{item}</span>
							{/each}
						</div>
					</div>
				</div>

				<div class="lp-demo-status">
					<span></span>
					{copy.hero.statusLabel}
				</div>
			</div>
		{:else if variant === 'add'}
			<div class="lp-demo-form-shell">
				<div class="lp-demo-demo-header">
					<div>
						<h3>{copy.add.title}</h3>
						<p>{copy.add.subtitle}</p>
					</div>
					<CircleDollarSign class="size-5" />
				</div>

				<div class="lp-demo-field">
					<span>{copy.add.serviceLabel}</span>
					<strong class="lp-demo-type lp-demo-type-service">{copy.add.serviceName}</strong>
				</div>

				<div class="lp-demo-field-grid">
					<div class="lp-demo-field">
						<span>{copy.add.amountLabel}</span>
						<strong class="lp-demo-type lp-demo-type-amount">{copy.add.amount}</strong>
					</div>
					<div class="lp-demo-field">
						<span>{copy.add.cycleLabel}</span>
						<strong>{copy.add.cycle}</strong>
					</div>
				</div>

				<Button class="lp-demo-add-button h-9 w-full" type="button" tabindex={-1}>
					<Plus class="size-4" />
					{copy.add.button}
				</Button>

				<div class="lp-demo-added-row">
					<div class="lp-demo-icon-ring">
						<Check class="size-4" />
					</div>
					<div>
						<strong>{copy.add.addedLabel}</strong>
						<span>{copy.add.serviceName} / {copy.add.amount}</span>
					</div>
				</div>

				<div class="lp-demo-form-total">
					<span>{copy.add.totalLabel}</span>
					<div>
						<span class="lp-demo-total-before">{copy.add.totalBefore}</span>
						<span class="lp-demo-total-after">{copy.add.totalAfter}</span>
					</div>
				</div>

				<div class="lp-demo-cursor">
					<MousePointer2 class="size-5" />
				</div>
			</div>
		{:else if variant === 'notification'}
			<div class="lp-demo-notification-shell">
				<div class="lp-demo-demo-header">
					<div>
						<h3>{copy.notification.title}</h3>
						<p>{copy.notification.subtitle}</p>
					</div>
					<Bell class="size-5" />
				</div>

				<div class="lp-demo-notification-stack">
					{#each copy.notification.cards as card, index (card.title)}
						<div
							class={cn(
								'lp-demo-reminder-card',
								index === 0 && 'lp-demo-reminder-card-active',
								index === 1 && 'lp-demo-reminder-card-middle',
								index === 2 && 'lp-demo-reminder-card-back'
							)}
						>
							<div class="lp-demo-icon-ring">
								<Bell class="size-4" />
							</div>
							<div>
								<strong>{card.title}</strong>
								<span>{card.body}</span>
								<small>{card.meta}</small>
							</div>
						</div>
					{/each}
				</div>

				<div class="lp-demo-settings-row">
					{#each copy.notification.settings as setting (setting)}
						<span>{setting}</span>
					{/each}
				</div>
			</div>
		{:else if variant === 'analytics'}
			<div class="lp-demo-analytics-shell">
				<div class="lp-demo-demo-header">
					<div>
						<h3>{copy.analytics.title}</h3>
						<p>{copy.analytics.subtitle}</p>
					</div>
					<CircleDollarSign class="size-5" />
				</div>

				<div class="lp-demo-analytics-layout">
					<div class="lp-demo-donut">
						<svg viewBox="0 0 120 120" aria-hidden="true">
							<circle class="lp-demo-donut-track" cx="60" cy="60" r="42" pathLength="100" />
							{#each analyticsSegments as segment (segment.label)}
								<circle
									class="lp-demo-analytics-segment"
									cx="60"
									cy="60"
									r="42"
									pathLength="100"
									style={`--segment-share: ${segment.share}; --segment-offset: ${segment.offset}; --segment-color: ${segment.color};`}
								/>
							{/each}
						</svg>
						<div>
							<span>{copy.analytics.totalLabel}</span>
							<strong>{copy.analytics.total}</strong>
						</div>
					</div>

					<div class="lp-demo-breakdown">
						{#each copy.analytics.items as item, index (item.label)}
							<div class="lp-demo-breakdown-row" style={`--row-index: ${index};`}>
								<span class="lp-demo-swatch"></span>
								<div>
									<strong>{item.label}</strong>
									<span>{item.amount}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="lp-demo-review-chip">
					<Check class="size-4" />
					{copy.analytics.reviewLabel}
				</div>
			</div>
		{:else}
			<div class="lp-demo-ticker-shell">
				<div class="lp-demo-ticker-row">
					<div class="lp-demo-ticker-track lp-demo-ticker-track-primary">
						{#each tickerRepeats as repeat (repeat)}
							{#each copy.ticker.categories as category (repeat + '-category-' + category)}
								<span>{category}</span>
							{/each}
						{/each}
					</div>
				</div>
				<div class="lp-demo-ticker-row">
					<div class="lp-demo-ticker-track lp-demo-ticker-track-secondary">
						{#each tickerRepeats as repeat (repeat)}
							{#each copy.ticker.cycles as cycle (repeat + '-cycle-' + cycle)}
								<span>{cycle}</span>
							{/each}
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.lp-demo {
		--demo-surface: color-mix(in oklab, var(--background) 92%, var(--muted));
		--demo-soft: color-mix(in oklab, var(--muted) 72%, var(--background));
		--demo-line: color-mix(in oklab, var(--border) 82%, transparent);
		--demo-ink: var(--foreground);
		--demo-muted: var(--muted-foreground);
		position: relative;
		min-width: 0;
		overflow: hidden;
		border: 1px solid var(--demo-line);
		border-radius: 8px;
		background: var(--demo-surface);
		box-shadow: 0 20px 60px color-mix(in oklab, var(--foreground) 9%, transparent);
		color: var(--demo-ink);
	}

	.lp-demo :global(svg) {
		flex-shrink: 0;
	}

	.lp-demo-browser,
	.lp-demo-form-shell,
	.lp-demo-notification-shell,
	.lp-demo-analytics-shell,
	.lp-demo-ticker-shell {
		position: relative;
		min-width: 0;
	}

	.lp-demo-hero {
		min-height: 360px;
	}

	.lp-demo-browser {
		display: flex;
		min-height: 360px;
		flex-direction: column;
		background:
			linear-gradient(135deg, color-mix(in oklab, var(--primary) 9%, transparent), transparent 42%),
			var(--demo-surface);
	}

	.lp-demo-chrome {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		border-bottom: 1px solid var(--demo-line);
		background: color-mix(in oklab, var(--background) 86%, transparent);
		padding: 0.7rem 0.85rem;
	}

	.lp-demo-dots {
		display: flex;
		gap: 0.35rem;
	}

	.lp-demo-dots span,
	.lp-demo-status span {
		display: block;
		border-radius: 999px;
	}

	.lp-demo-dots span {
		width: 0.5rem;
		height: 0.5rem;
		background: color-mix(in oklab, var(--muted-foreground) 45%, transparent);
	}

	.lp-demo-dots span:nth-child(1) {
		background: #f87171;
	}

	.lp-demo-dots span:nth-child(2) {
		background: #fbbf24;
	}

	.lp-demo-dots span:nth-child(3) {
		background: #34d399;
	}

	.lp-demo-window-title {
		min-width: 0;
		overflow: hidden;
		color: var(--demo-muted);
		font-size: 0.78rem;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lp-demo-hero-grid {
		display: grid;
		flex: 1;
		grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
		gap: 0.75rem;
		padding: 0.9rem;
	}

	.lp-demo-total-card,
	.lp-demo-next-card,
	.lp-demo-calendar-card,
	.lp-demo-field,
	.lp-demo-added-row,
	.lp-demo-form-total,
	.lp-demo-reminder-card,
	.lp-demo-review-chip,
	.lp-demo-breakdown-row {
		border: 1px solid var(--demo-line);
		border-radius: 8px;
		background: color-mix(in oklab, var(--background) 90%, transparent);
	}

	.lp-demo-total-card {
		grid-row: span 2;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-height: 208px;
		padding: 1rem;
		animation: lp-demo-panel-in 680ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.lp-demo-card-heading {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--demo-muted);
		font-size: 0.78rem;
		font-weight: 700;
	}

	.lp-demo-total-value {
		position: relative;
		min-height: 3.2rem;
		font-size: 2rem;
		font-weight: 800;
		line-height: 1;
	}

	.lp-demo-total-value span,
	.lp-demo-form-total div span {
		position: absolute;
		inset: 0 auto auto 0;
		white-space: nowrap;
	}

	.lp-demo-total-before {
		opacity: 0;
		animation: lp-demo-total-before 8s ease-in-out infinite;
	}

	.lp-demo-total-after {
		opacity: 1;
		animation: lp-demo-total-after 8s ease-in-out infinite;
	}

	.lp-demo-total-card p {
		color: var(--demo-muted);
		font-size: 0.78rem;
		line-height: 1.6;
	}

	.lp-demo-next-card,
	.lp-demo-calendar-card {
		padding: 0.85rem;
		animation: lp-demo-panel-in 680ms cubic-bezier(0.22, 1, 0.36, 1) 120ms both;
	}

	.lp-demo-next-card {
		animation-name: lp-demo-panel-in, lp-demo-card-pulse;
		animation-duration: 680ms, 4.5s;
		animation-delay: 120ms, 1.1s;
		animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1), ease-in-out;
		animation-iteration-count: 1, infinite;
		animation-fill-mode: both, none;
	}

	.lp-demo-next-service {
		margin-top: 1rem;
		font-weight: 800;
	}

	.lp-demo-next-meta {
		margin-top: 0.45rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		color: var(--demo-muted);
		font-size: 0.78rem;
	}

	.lp-demo-next-meta strong {
		color: var(--demo-ink);
		font-size: 0.9rem;
	}

	.lp-demo-notice-card {
		position: absolute;
		right: 1rem;
		bottom: 3.2rem;
		display: flex;
		width: min(20rem, calc(100% - 2rem));
		gap: 0.7rem;
		border: 1px solid color-mix(in oklab, var(--primary) 32%, var(--border));
		border-radius: 8px;
		background: color-mix(in oklab, var(--background) 94%, var(--primary));
		padding: 0.8rem;
		box-shadow: 0 16px 38px color-mix(in oklab, var(--primary) 14%, transparent);
		animation: lp-demo-slide-notice 7s ease-in-out infinite;
	}

	.lp-demo-notice-card strong,
	.lp-demo-notice-card span,
	.lp-demo-added-row strong,
	.lp-demo-added-row span,
	.lp-demo-reminder-card strong,
	.lp-demo-reminder-card span,
	.lp-demo-reminder-card small {
		display: block;
	}

	.lp-demo-notice-card strong,
	.lp-demo-added-row strong,
	.lp-demo-reminder-card strong {
		font-size: 0.83rem;
	}

	.lp-demo-notice-card span,
	.lp-demo-added-row span,
	.lp-demo-reminder-card span,
	.lp-demo-reminder-card small {
		color: var(--demo-muted);
		font-size: 0.74rem;
		line-height: 1.45;
	}

	.lp-demo-icon-ring {
		display: flex;
		width: 2rem;
		height: 2rem;
		flex: 0 0 auto;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: color-mix(in oklab, var(--primary) 12%, var(--background));
		color: var(--primary);
	}

	.lp-demo-calendar-list {
		margin-top: 0.8rem;
		display: grid;
		gap: 0.42rem;
	}

	.lp-demo-calendar-list span {
		border-radius: 6px;
		background: var(--demo-soft);
		padding: 0.45rem 0.55rem;
		color: var(--demo-muted);
		font-size: 0.75rem;
		font-weight: 650;
	}

	.lp-demo-status {
		position: absolute;
		right: 1rem;
		bottom: 0.85rem;
		left: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--demo-muted);
		font-size: 0.74rem;
	}

	.lp-demo-status span {
		width: 0.5rem;
		height: 0.5rem;
		background: #22c55e;
		box-shadow: 0 0 0 0 color-mix(in oklab, #22c55e 42%, transparent);
		animation: lp-demo-status-ping 2.6s ease-out infinite;
	}

	.lp-demo-form-shell,
	.lp-demo-notification-shell,
	.lp-demo-analytics-shell {
		min-height: 272px;
		padding: 0.9rem;
	}

	.lp-demo-demo-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.85rem;
	}

	.lp-demo-demo-header h3 {
		font-size: 0.98rem;
		font-weight: 800;
		line-height: 1.3;
	}

	.lp-demo-demo-header p {
		margin-top: 0.18rem;
		color: var(--demo-muted);
		font-size: 0.76rem;
	}

	.lp-demo-field {
		display: grid;
		gap: 0.35rem;
		margin-bottom: 0.65rem;
		padding: 0.7rem 0.75rem;
	}

	.lp-demo-field span,
	.lp-demo-form-total > span {
		color: var(--demo-muted);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.lp-demo-field strong {
		min-height: 1.2rem;
		font-size: 0.88rem;
	}

	.lp-demo-field-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 0.78fr);
		gap: 0.55rem;
	}

	.lp-demo-type {
		width: max-content;
		max-width: 100%;
		overflow: hidden;
		animation: lp-demo-type 5.6s steps(10, end) infinite;
	}

	.lp-demo-type-amount {
		animation-delay: 0.7s;
	}

	.lp-demo-add-button {
		margin-top: 0.05rem;
		animation: lp-demo-button-press 5.6s ease-in-out infinite;
	}

	.lp-demo-added-row {
		display: flex;
		gap: 0.65rem;
		margin-top: 0.7rem;
		padding: 0.65rem;
		transform-origin: center;
		animation: lp-demo-row-pop 5.6s ease-in-out infinite;
	}

	.lp-demo-form-total {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
		margin-top: 0.7rem;
		padding: 0.7rem 0.75rem;
	}

	.lp-demo-form-total div {
		position: relative;
		width: 6.8rem;
		min-height: 1.3rem;
		font-weight: 800;
		text-align: right;
	}

	.lp-demo-form-total div span {
		inset: 0 0 auto auto;
	}

	.lp-demo-cursor {
		position: absolute;
		top: 3rem;
		left: 1.6rem;
		color: var(--primary);
		filter: drop-shadow(0 8px 14px color-mix(in oklab, var(--primary) 22%, transparent));
		animation: lp-demo-cursor-move 5.6s ease-in-out infinite;
	}

	.lp-demo-notification-stack {
		position: relative;
		min-height: 150px;
	}

	.lp-demo-reminder-card {
		position: absolute;
		inset: 0 0 auto;
		display: flex;
		gap: 0.7rem;
		padding: 0.78rem;
		box-shadow: 0 16px 36px color-mix(in oklab, var(--foreground) 8%, transparent);
	}

	.lp-demo-reminder-card-active {
		z-index: 3;
		animation: lp-demo-reminder-active 6.2s ease-in-out infinite;
	}

	.lp-demo-reminder-card-middle {
		z-index: 2;
		transform: translateY(2.15rem) scale(0.96);
		opacity: 0.72;
	}

	.lp-demo-reminder-card-back {
		z-index: 1;
		transform: translateY(4.2rem) scale(0.92);
		opacity: 0.42;
	}

	.lp-demo-settings-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin-top: 0.75rem;
	}

	.lp-demo-settings-row span,
	.lp-demo-ticker-track span {
		border: 1px solid color-mix(in oklab, var(--primary) 18%, var(--border));
		border-radius: 999px;
		background: color-mix(in oklab, var(--primary) 8%, var(--background));
		color: color-mix(in oklab, var(--primary) 72%, var(--foreground));
		font-size: 0.74rem;
		font-weight: 750;
		white-space: nowrap;
	}

	.lp-demo-settings-row span {
		padding: 0.35rem 0.55rem;
	}

	.lp-demo-analytics-layout {
		display: grid;
		grid-template-columns: minmax(7.5rem, 0.88fr) minmax(0, 1fr);
		gap: 0.8rem;
		align-items: center;
	}

	.lp-demo-donut {
		position: relative;
		aspect-ratio: 1;
		min-width: 0;
	}

	.lp-demo-donut svg {
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.lp-demo-donut-track,
	.lp-demo-analytics-segment {
		fill: none;
		stroke-width: 14;
	}

	.lp-demo-donut-track {
		stroke: color-mix(in oklab, var(--border) 86%, transparent);
	}

	.lp-demo-analytics-segment {
		stroke: var(--segment-color);
		stroke-dasharray: var(--segment-share) 100;
		stroke-dashoffset: calc(var(--segment-offset) * -1);
		stroke-linecap: round;
		transform-origin: center;
		animation: lp-demo-chart-draw 1.4s cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	.lp-demo-donut > div {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.lp-demo-donut span,
	.lp-demo-breakdown-row span,
	.lp-demo-review-chip {
		color: var(--demo-muted);
		font-size: 0.72rem;
	}

	.lp-demo-donut strong {
		margin-top: 0.2rem;
		font-size: 1.02rem;
	}

	.lp-demo-breakdown {
		display: grid;
		gap: 0.5rem;
		min-width: 0;
	}

	.lp-demo-breakdown-row {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.55rem;
		align-items: center;
		padding: 0.55rem 0.6rem;
		animation: lp-demo-row-highlight 5.4s ease-in-out infinite;
		animation-delay: calc(var(--row-index) * 1.1s);
	}

	.lp-demo-swatch {
		width: 0.62rem;
		height: 0.62rem;
		border-radius: 999px;
		background: var(--primary);
	}

	.lp-demo-breakdown-row:nth-child(2) .lp-demo-swatch {
		background: #22c55e;
	}

	.lp-demo-breakdown-row:nth-child(3) .lp-demo-swatch {
		background: #f97316;
	}

	.lp-demo-breakdown-row strong,
	.lp-demo-breakdown-row span {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.lp-demo-breakdown-row strong {
		font-size: 0.8rem;
	}

	.lp-demo-review-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.75rem;
		padding: 0.45rem 0.55rem;
		background: color-mix(in oklab, #22c55e 10%, var(--background));
		color: color-mix(in oklab, #15803d 75%, var(--foreground));
		font-weight: 800;
	}

	.lp-demo-ticker {
		box-shadow: none;
	}

	.lp-demo-ticker-shell {
		display: grid;
		gap: 0.7rem;
		padding: 0.8rem 0;
		background:
			linear-gradient(90deg, var(--demo-surface), transparent 14% 86%, var(--demo-surface)),
			var(--demo-surface);
	}

	.lp-demo-ticker-row {
		overflow: hidden;
	}

	.lp-demo-ticker-track {
		display: flex;
		width: max-content;
		gap: 0.5rem;
		padding-inline: 0.8rem;
		animation: lp-demo-ticker-scroll 24s linear infinite;
	}

	.lp-demo-ticker-track-secondary {
		animation-duration: 30s;
		animation-direction: reverse;
	}

	.lp-demo-ticker:hover .lp-demo-ticker-track {
		animation-play-state: paused;
	}

	.lp-demo-ticker-track span {
		padding: 0.45rem 0.7rem;
	}

	@keyframes lp-demo-panel-in {
		from {
			opacity: 0;
			transform: translateY(16px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes lp-demo-total-before {
		0%,
		26% {
			opacity: 1;
			transform: translateY(0);
		}
		34%,
		100% {
			opacity: 0;
			transform: translateY(-0.45rem);
		}
	}

	@keyframes lp-demo-total-after {
		0%,
		28% {
			opacity: 0;
			transform: translateY(0.45rem);
		}
		36%,
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes lp-demo-card-pulse {
		0%,
		100% {
			border-color: var(--demo-line);
			box-shadow: none;
		}
		45%,
		62% {
			border-color: color-mix(in oklab, var(--primary) 38%, var(--border));
			box-shadow: 0 0 0 4px color-mix(in oklab, var(--primary) 8%, transparent);
		}
	}

	@keyframes lp-demo-slide-notice {
		0%,
		18%,
		100% {
			opacity: 0;
			transform: translateY(18px);
		}
		28%,
		76% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes lp-demo-status-ping {
		0% {
			box-shadow: 0 0 0 0 color-mix(in oklab, #22c55e 42%, transparent);
		}
		80%,
		100% {
			box-shadow: 0 0 0 0.55rem color-mix(in oklab, #22c55e 0%, transparent);
		}
	}

	@keyframes lp-demo-type {
		0%,
		18% {
			clip-path: inset(0 100% 0 0);
		}
		42%,
		100% {
			clip-path: inset(0 0 0 0);
		}
	}

	@keyframes lp-demo-button-press {
		0%,
		52%,
		70%,
		100% {
			transform: translateY(0) scale(1);
		}
		58% {
			transform: translateY(1px) scale(0.985);
		}
	}

	@keyframes lp-demo-row-pop {
		0%,
		56% {
			opacity: 0;
			transform: translateY(10px) scale(0.98);
		}
		68%,
		100% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes lp-demo-cursor-move {
		0%,
		16% {
			transform: translate(0, 0);
		}
		38% {
			transform: translate(8.5rem, 3.6rem);
		}
		56% {
			transform: translate(12rem, 8.1rem);
		}
		74%,
		100% {
			transform: translate(14rem, 12.1rem);
		}
	}

	@keyframes lp-demo-reminder-active {
		0%,
		12%,
		100% {
			opacity: 0;
			transform: translateY(-1.2rem) scale(0.98);
		}
		24%,
		74% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
		88% {
			opacity: 0;
			transform: translateY(1.2rem) scale(0.98);
		}
	}

	@keyframes lp-demo-chart-draw {
		from {
			stroke-dasharray: 0 100;
		}
	}

	@keyframes lp-demo-row-highlight {
		0%,
		100% {
			border-color: var(--demo-line);
			background: color-mix(in oklab, var(--background) 90%, transparent);
		}
		35%,
		55% {
			border-color: color-mix(in oklab, var(--primary) 28%, var(--border));
			background: color-mix(in oklab, var(--primary) 8%, var(--background));
		}
	}

	@keyframes lp-demo-ticker-scroll {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(-50%);
		}
	}

	@media (max-width: 640px) {
		.lp-demo-hero,
		.lp-demo-browser {
			min-height: 430px;
		}

		.lp-demo-hero-grid,
		.lp-demo-analytics-layout,
		.lp-demo-field-grid {
			grid-template-columns: 1fr;
		}

		.lp-demo-total-card {
			min-height: 164px;
		}

		.lp-demo-notice-card {
			right: 0.75rem;
			bottom: 3.1rem;
			left: 0.75rem;
			width: auto;
		}

		.lp-demo-calendar-card {
			padding-bottom: 4.6rem;
		}

		.lp-demo-form-shell,
		.lp-demo-notification-shell,
		.lp-demo-analytics-shell {
			min-height: 300px;
		}

		.lp-demo-cursor {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lp-demo *,
		.lp-demo *::before,
		.lp-demo *::after {
			animation: none !important;
			transition: none !important;
		}

		.lp-demo-total-before {
			opacity: 0;
		}

		.lp-demo-total-after,
		.lp-demo-added-row,
		.lp-demo-reminder-card-active,
		.lp-demo-notice-card {
			opacity: 1;
			transform: none;
		}

		.lp-demo-type {
			clip-path: inset(0 0 0 0);
		}

		.lp-demo-cursor {
			display: none;
		}
	}
</style>
