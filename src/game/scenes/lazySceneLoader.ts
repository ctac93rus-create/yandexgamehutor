import Phaser from 'phaser';

type SceneCtor = new () => Phaser.Scene;

const SCENE_IMPORTERS: Record<string, () => Promise<SceneCtor>> = {
  MergeScene: async () => (await import('./MergeScene')).MergeScene,
  HutScene: async () => (await import('./HutScene')).HutScene,
  RaidScene: async () => (await import('./RaidScene')).RaidScene,
  SocialScene: async () => (await import('./SocialScene')).SocialScene,
  SettingsScene: async () => (await import('./SettingsScene')).SettingsScene,
  ProgressScene: async () => (await import('./ProgressScene')).ProgressScene,
};

export async function ensureLazyScene(scene: Phaser.Scene, sceneKey: string): Promise<void> {
  if (scene.scene.manager.keys[sceneKey]) {
    return;
  }

  const importer = SCENE_IMPORTERS[sceneKey];
  if (!importer) {
    return;
  }

  const SceneClass = await importer();

  if (!scene.scene.manager.keys[sceneKey]) {
    scene.scene.add(sceneKey, SceneClass, false);
  }
}
