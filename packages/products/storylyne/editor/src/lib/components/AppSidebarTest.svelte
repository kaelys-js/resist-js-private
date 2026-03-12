<script lang="ts">
  import TestProviders from './TestProviders.svelte';
  import AppSidebar from './AppSidebar.svelte';

  const user = {
    id: 'user-1',
    displayName: 'Test User',
    email: 'test@example.com',
    avatarUrl: '',
  };

  const project = {
    id: 'proj-1',
    name: 'Project',
    subtitle: '',
    ownerId: 'user-1',
  };

  const scenes = [
    { id: 'scene-1', title: 'Overworld', url: '#overworld', isActive: true, order: 0 },
    { id: 'scene-2', title: 'Town Interior', url: '#town-interior', isActive: false, order: 1 },
    { id: 'scene-3', title: 'Dungeon B1', url: '#dungeon-b1', isActive: false, order: 2 },
  ];
</script>

<TestProviders>
  <AppSidebar {user} {project} {scenes} />
</TestProviders>
