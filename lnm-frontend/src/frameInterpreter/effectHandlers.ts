import {
	LnmEffectArgsMap,
	LnmFrameCharacterData,
	LnmFrameEffect,
	LnmFrameEffectType,
	LnmPlayerState,
	LnmPlot,
	LnmTask,
} from './types';
import { reportCampaign } from './communication/reportCampaign';

export type EffectHandler = (
	effect: LnmFrameEffect,
	context: {
		reportCampaign: (id: string) => string | null;
		setCurrentFrameId: (id: string) => void;
		setCurrentChapterId: (id: string) => void;
		onJumpChapter: (id: string) => void;
		setCurrentEndingId: (id: string) => void;
		setIsEnding: (isEnding: boolean) => void;
		setCurrentCharacters: React.Dispatch<
			React.SetStateAction<LnmFrameCharacterData[] | null>
		>;
		decreaseHealth: (amount: number | 'kill') => void;
		increaseHealth: (amount: number | 'full') => void;
		setPlayerState: (playerState: LnmPlayerState) => void;
		getIntermediateResult: () => boolean | null;
		setIntermediateResult: (result: boolean | null) => void;
		openTaskWindow: (task: LnmTask) => void;
		playMusic: (musicId: string) => void;
		stopMusic: () => void;
		plot: LnmPlot;
	}
) => void;

// Effect Handlers Map
export const effectHandlers: Partial<
	Record<LnmFrameEffectType, EffectHandler>
> = {
	[LnmFrameEffectType.JUMP]: (effect, { setCurrentFrameId }) => {
		const args = effect.args as LnmEffectArgsMap[LnmFrameEffectType.JUMP];
		console.log('Processing JUMP effect:', args);
		setCurrentFrameId(args.frameId);
	},

	[LnmFrameEffectType.JUMP_CHAPTER]: (
		effect,
		{ setCurrentChapterId, setCurrentFrameId, onJumpChapter, plot }
	) => {
		const args =
			effect.args as LnmEffectArgsMap[LnmFrameEffectType.JUMP_CHAPTER];
		console.log('Processing JUMP_CHAPTER effect:', args);
		const nextChapter = plot.chapters.get(args.chapterId);
		if (nextChapter) {
			setCurrentChapterId(args.chapterId);
			setCurrentFrameId(nextChapter.startFrame);
			onJumpChapter(args.chapterId);
		}
	},

	[LnmFrameEffectType.FADE_IN_CHARACTER]: (
		effect,
		{ setCurrentCharacters }
	) => {
		const args =
			effect.args as LnmEffectArgsMap[LnmFrameEffectType.FADE_IN_CHARACTER];
		setCurrentCharacters((prev) => {
			const updated = prev ? [...prev] : [];
			const characterIndex = updated.findIndex(
				(c) => c.id === args.characterId
			);
			if (characterIndex === -1) {
				updated.push({
					id: args.characterId,
					hidden: false, // Ensure the character is visible
				});
			} else {
				updated[characterIndex] = {
					...updated[characterIndex],
					hidden: false,
				};
			}
			return updated;
		});
	},

	[LnmFrameEffectType.CHANGE_POSE]: (effect, { setCurrentCharacters }) => {
		const args =
			effect.args as LnmEffectArgsMap[LnmFrameEffectType.CHANGE_POSE];
		setCurrentCharacters((prev) => {
			if (!prev) return prev;
			return prev.map((c) =>
				c.id === args.characterId ? { ...c, pose: args.newPose } : c
			);
		});
	},

	[LnmFrameEffectType.FADE_OUT_CHARACTER]: (
		effect,
		{ setCurrentCharacters }
	) => {
		const args =
			effect.args as LnmEffectArgsMap[LnmFrameEffectType.FADE_OUT_CHARACTER];
		setCurrentCharacters((prev) => {
			if (!prev) return prev;
			return prev.map((c) =>
				c.id === args.characterId ? { ...c, hidden: true } : c
			);
		});
	},

	[LnmFrameEffectType.DECREASE_HEALTH]: (effect, { decreaseHealth }) => {
		const args =
			effect.args as LnmEffectArgsMap[LnmFrameEffectType.DECREASE_HEALTH];
		console.log('Processing DECREASE_HEALTH effect:', args);
		if (args.amount) {
			decreaseHealth(args.amount);
		}
	},

	[LnmFrameEffectType.INCREASE_HEALTH]: (effect, { increaseHealth }) => {
		const args =
			effect.args as LnmEffectArgsMap[LnmFrameEffectType.INCREASE_HEALTH];
		console.log('Processing INCREASE_HEALTH effect:', args);
		if (args.amount) {
			increaseHealth(args.amount);
		}
	},

	[LnmFrameEffectType.START_TASK]: (effect, { openTaskWindow, plot }) => {
		const args = effect.args as { taskId: string };
		const task = plot.tasks.get(args.taskId); // Assume tasks are stored in the plot object
		if (task) {
			openTaskWindow(task);
		} else {
			console.warn(`Task with ID ${args.taskId} not found.`);
		}
	},

	[LnmFrameEffectType.END_CAMPAIGN]: async (
		effect,
		{
			setIsEnding,
			setCurrentChapterId,
			setCurrentFrameId,
			setIntermediateResult,
			plot,
		}
	) => {
		const args =
			effect.args as LnmEffectArgsMap[LnmFrameEffectType.END_CAMPAIGN];
		console.log('Processing END_CAMPAIGN effect:', args);
		setIntermediateResult(args.winner);
		try {
			const response = await reportCampaign(args.winner);
			const nextChapter = plot.chapters.get(
				`ending_${response.endingId}`
			);
			if (nextChapter) {
				setIsEnding(true);
				setCurrentChapterId(`ending_${response.endingId}`);
				setCurrentFrameId(nextChapter.startFrame);
			}
		} catch (err) {
			console.error('Error reporting campaign:', err);
			setIntermediateResult(false);
			console.log('Fallback to default ending...');
			if (plot.defaultEnding && plot.chapters.has(plot.defaultEnding)) {
				const defaultEndingChapter = plot.chapters.get(
					plot.defaultEnding
				);
				setIsEnding(true);
				setCurrentChapterId(plot.defaultEnding);
				setCurrentFrameId(defaultEndingChapter!.startFrame);
			}
		}
	},

	[LnmFrameEffectType.STOP]: (
		_effect,
		{ setPlayerState, getIntermediateResult }
	) => {
		setPlayerState(
			getIntermediateResult() === true
				? LnmPlayerState.WAITING_WON
				: LnmPlayerState.WAITING_LOST
		);
	},

	[LnmFrameEffectType.PLAY_MUSIC]: (_effect, { playMusic, plot }) => {
		const args =
			_effect.args as LnmEffectArgsMap[LnmFrameEffectType.PLAY_MUSIC];
		console.log('Processing PLAY_MUSIC effect:', args);
		if (plot.music.has(args.musicId)) {
			const url = plot.music.get(args.musicId)?.file || '';
			console.log(`music id: ${args.musicId}, url: ${url}`);
			playMusic(url);
		} else {
			console.warn(`Music with ID ${args.musicId} not found.`);
		}
	},

	[LnmFrameEffectType.STOP_MUSIC]: (_effect, { stopMusic }) => {
		console.log('Processing STOP_MUSIC effect');
		stopMusic();
	},
	// TODO: Add handlers for other effect types as needed
};
