<script lang="ts">
  import type { Str } from '@/schemas/common';
  import FeatureFlagsTestProviders from './FeatureFlagsTestProviders.svelte';
  import AppSidebar from './AppSidebar.svelte';
  import type { ServerUser, ServerProject, ServerScene } from '$lib/server/data/types';

  const defaultUser: ServerUser = {
    id: 'user-1',
    displayName: 'Test User',
    email: 'test@example.com',
    avatarUrl: '',
  };

  const defaultProject: ServerProject = {
    id: 'proj-1',
    name: 'Test Project',
    subtitle: '',
    ownerId: 'user-1',
  };

  const defaultScenes: readonly ServerScene[] = [
    { id: 'scene-1', title: 'Overworld', url: '#overworld', isActive: true, order: 0 },
    { id: 'scene-2', title: 'Town Interior', url: '#town-interior', isActive: false, order: 1 },
    { id: 'scene-3', title: 'Dungeon B1', url: '#dungeon-b1', isActive: false, order: 2 },
  ];

  let {
    disabledFlags = [],
    user = defaultUser,
    project = defaultProject,
    scenes = defaultScenes,
  }: {
    disabledFlags?: Str[];
    user?: ServerUser | null;
    project?: ServerProject | null;
    scenes?: readonly ServerScene[];
  } = $props();
</script>

<FeatureFlagsTestProviders {disabledFlags}>
  <AppSidebar {user} {project} {scenes} />
</FeatureFlagsTestProviders>
