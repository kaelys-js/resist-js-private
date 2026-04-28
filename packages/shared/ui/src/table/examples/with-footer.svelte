<script lang="ts">
  /**
   * Lens example — Table demonstrating a footer row used to
   * display column totals.
   *
   * @module
   */
  import * as Table from '@/ui/table';
</script>

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
