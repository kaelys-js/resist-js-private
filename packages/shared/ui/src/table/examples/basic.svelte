<script lang="ts">
  import * as Table from '@/ui/table';
</script>

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
