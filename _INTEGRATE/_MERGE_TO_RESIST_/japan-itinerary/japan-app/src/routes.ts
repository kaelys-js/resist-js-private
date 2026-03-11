import TimelinePage from './components/timeline/TimelinePage.svelte';
import BookingsPage from './components/bookings/BookingsPage.svelte';
import BudgetPage from './components/budget/BudgetPage.svelte';
import ChecklistPage from './components/checklist/ChecklistPage.svelte';

const routes = [
  { path: '/', redirect: '/timeline/' },
  { path: '/timeline/', component: TimelinePage },
  { path: '/bookings/', component: BookingsPage },
  { path: '/budget/', component: BudgetPage },
  { path: '/checklist/', component: ChecklistPage },
];

export default routes;
