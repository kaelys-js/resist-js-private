<script lang="ts">
import DemoSection from '../demo-section/DemoSection.svelte';
import { FinanceCard } from './index.js';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Positive Trend" description="A finance card showing a value with an upward trend indicator.">
		<div class="max-w-sm">
			<FinanceCard label="Total Revenue" value="$45,231.89" trend="up" subtitle="+20.1% from last month" />
		</div>
	</DemoSection>

	<DemoSection title="Negative Trend" description="Card with a downward trend and destructive value styling.">
		<div class="max-w-sm">
			<FinanceCard
				label="Total Debt"
				value="$12,500.00"
				valueClass="text-destructive"
				trend="down"
				subtitle="+4.3% from last month"
			/>
		</div>
	</DemoSection>

	<DemoSection title="Neutral Trend" description="Card with a neutral trend indicator for flat metrics.">
		<div class="max-w-sm">
			<FinanceCard label="Active Users" value="2,350" trend="neutral" subtitle="No change from last week" />
		</div>
	</DemoSection>

	<DemoSection title="Without Trend" description="Card without any trend badge — just label and value.">
		<div class="max-w-sm">
			<FinanceCard label="Projects" value="12" />
		</div>
	</DemoSection>

	<DemoSection title="Without Subtitle" description="Card with a trend badge but no footer subtitle.">
		<div class="max-w-sm">
			<FinanceCard label="Monthly Savings" value="$1,200.00" trend="up" />
		</div>
	</DemoSection>

	<DemoSection title="Grid Layout" description="Multiple finance cards in a responsive grid — typical dashboard pattern.">
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<FinanceCard label="Total Revenue" value="$45,231" trend="up" subtitle="+20.1% from last month" />
			<FinanceCard label="Subscriptions" value="+2,350" trend="up" subtitle="+180.1% from last month" />
			<FinanceCard
				label="Expenses"
				value="$12,234"
				valueClass="text-destructive"
				trend="down"
				subtitle="+19% from last month"
			/>
			<FinanceCard label="Active Now" value="573" trend="neutral" subtitle="+201 since last hour" />
		</div>
	</DemoSection>
</div>
