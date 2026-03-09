<script lang="ts">
import * as Table from './index.js';
import DemoSection from '../demo-section/DemoSection.svelte';
</script>

<div class="flex flex-col gap-6">
	<DemoSection title="Basic Table" description="Simple table with header, body, and rows.">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Name</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>Role</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				<Table.Row>
					<Table.Cell>Alice</Table.Cell>
					<Table.Cell>Active</Table.Cell>
					<Table.Cell>Admin</Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell>Bob</Table.Cell>
					<Table.Cell>Inactive</Table.Cell>
					<Table.Cell>Editor</Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell>Charlie</Table.Cell>
					<Table.Cell>Active</Table.Cell>
					<Table.Cell>Viewer</Table.Cell>
				</Table.Row>
			</Table.Body>
		</Table.Root>
	</DemoSection>

	<DemoSection title="With Caption" description="Table with a caption element for accessibility context.">
		<Table.Root>
			<Table.Caption>A list of recent invoices.</Table.Caption>
			<Table.Header>
				<Table.Row>
					<Table.Head>Invoice</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>Method</Table.Head>
					<Table.Head class="text-right">Amount</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				<Table.Row>
					<Table.Cell class="font-medium">INV-001</Table.Cell>
					<Table.Cell>Paid</Table.Cell>
					<Table.Cell>Credit Card</Table.Cell>
					<Table.Cell class="text-right">$250.00</Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell class="font-medium">INV-002</Table.Cell>
					<Table.Cell>Pending</Table.Cell>
					<Table.Cell>PayPal</Table.Cell>
					<Table.Cell class="text-right">$150.00</Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell class="font-medium">INV-003</Table.Cell>
					<Table.Cell>Unpaid</Table.Cell>
					<Table.Cell>Bank Transfer</Table.Cell>
					<Table.Cell class="text-right">$350.00</Table.Cell>
				</Table.Row>
			</Table.Body>
		</Table.Root>
	</DemoSection>

	<DemoSection title="With Footer" description="Table including a footer row for totals or summaries.">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Item</Table.Head>
					<Table.Head class="text-right">Qty</Table.Head>
					<Table.Head class="text-right">Price</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				<Table.Row>
					<Table.Cell>Widget A</Table.Cell>
					<Table.Cell class="text-right">2</Table.Cell>
					<Table.Cell class="text-right">$20.00</Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell>Widget B</Table.Cell>
					<Table.Cell class="text-right">1</Table.Cell>
					<Table.Cell class="text-right">$35.00</Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell>Widget C</Table.Cell>
					<Table.Cell class="text-right">3</Table.Cell>
					<Table.Cell class="text-right">$15.00</Table.Cell>
				</Table.Row>
			</Table.Body>
			<Table.Footer>
				<Table.Row>
					<Table.Cell class="font-medium">Total</Table.Cell>
					<Table.Cell class="text-right">6</Table.Cell>
					<Table.Cell class="text-right font-medium">$120.00</Table.Cell>
				</Table.Row>
			</Table.Footer>
		</Table.Root>
	</DemoSection>

	<DemoSection title="Striped Appearance" description="Alternating row backgrounds using Tailwind utilities.">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>#</Table.Head>
					<Table.Head>Title</Table.Head>
					<Table.Head>Author</Table.Head>
					<Table.Head>Year</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				<Table.Row class="bg-muted/50">
					<Table.Cell>1</Table.Cell>
					<Table.Cell>The Great Adventure</Table.Cell>
					<Table.Cell>J. Smith</Table.Cell>
					<Table.Cell>2021</Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell>2</Table.Cell>
					<Table.Cell>Code and Beyond</Table.Cell>
					<Table.Cell>A. Turing</Table.Cell>
					<Table.Cell>2022</Table.Cell>
				</Table.Row>
				<Table.Row class="bg-muted/50">
					<Table.Cell>3</Table.Cell>
					<Table.Cell>Digital Horizons</Table.Cell>
					<Table.Cell>M. Lovelace</Table.Cell>
					<Table.Cell>2023</Table.Cell>
				</Table.Row>
				<Table.Row>
					<Table.Cell>4</Table.Cell>
					<Table.Cell>Pixel Dreams</Table.Cell>
					<Table.Cell>R. Carmack</Table.Cell>
					<Table.Cell>2024</Table.Cell>
				</Table.Row>
			</Table.Body>
		</Table.Root>
	</DemoSection>
</div>
