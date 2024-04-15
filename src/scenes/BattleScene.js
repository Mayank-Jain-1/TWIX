import {
	SCENE_WIDTH,
	STAGE_MID_POINT,
	STAGE_PADDING,
} from '../constants/Stage.js';
import {
	FighterAttackBaseData,
	FighterAttackStrength,
	FighterId,
	FighterStruckDelay,
} from '../constants/fighter.js';
import { FRAME_TIME } from '../constants/game.js';
import { Camera } from '../engine/Camera.js';
import { Ken, Ryu } from '../entitites/fighters/index.js';
import {
	HeavyHitSplash,
	LightHitSplash,
	MediumHitSplash,
	Shadow,
} from '../entitites/fighters/shared/index.js';
import { Fireball } from '../entitites/fighters/special/Fireball.js';
import { FpsCounter } from '../entitites/overlays/FpsCounter.js';
import { StatusBar } from '../entitites/overlays/StatusBar.js';
import { KenStage } from '../entitites/stage/KenStage.js';
import { gameState } from '../states/gameState.js';

export class BattleScene {
	fighters = [];
	camera = undefined;
	shadows = [];
	entities = [];
	FighterDrawOrder = [0, 1];
	hurtTimer = 0;

	constructor() {
		this.stage = new KenStage();
		this.overlays = [new StatusBar(this.fighters), new FpsCounter()];
		this.startRound();
	}

	getFighterClass = (id) => {
		switch (id) {
			case FighterId.KEN:
				return Ken;
			case FighterId.RYU:
				return Ryu;
			default:
				return new Error('Invalid Fighter Id');
		}
	};

	getFighterEntitiy = (id, index) => {
		const FighterClass = this.getFighterClass(id);
		return new FighterClass(
			index,
			this.handleAttackHit.bind(this),
			this.addEntity.bind(this)
		);
	};

	getFighterEntities = () => {
		const fighterEntities = gameState.fighters.map(({ id }, index) =>
			this.getFighterEntitiy(id, index)
		);

		fighterEntities[0].opponent = fighterEntities[1];
		fighterEntities[1].opponent = fighterEntities[0];

		return fighterEntities;
	};

	updateFighters = (time, context) => {
		this.fighters.map((fighter) => {
			if (this.hurtTimer > time.previous) {
				fighter.updateHurtShake(time, this.hurtTimer);
			} else fighter.update(time, this.camera);
		});
	};

	getHitSplashClass = (strength) => {
		switch (strength) {
			case FighterAttackStrength.LIGHT:
				return LightHitSplash;
			case FighterAttackStrength.MEDIUM:
				return MediumHitSplash;
			case FighterAttackStrength.HEAVY:
				return HeavyHitSplash;
			default:
				return new Error('Invalid Strength Splash requested');
		}
	};

	handleAttackHit = (time, playerId, opponentId, position, strength) => {
		this.FighterDrawOrder = [opponentId, playerId];
		gameState.fighters[playerId].score += FighterAttackBaseData[strength].score;

		gameState.fighters[opponentId].hitPoints -=
			FighterAttackBaseData[strength].damage;

		const HitSplashClass = this.getHitSplashClass(strength);

		position &&
			this.addEntity(HitSplashClass, position.x, position.y, playerId);

		this.hurtTimer = time.previous + FighterStruckDelay * FRAME_TIME;
	};

	updateShadows = (time) => {
		this.shadows.map((shadow) => shadow.update(time));
	};

	startRound = () => {
		this.fighters = this.getFighterEntities();
		this.camera = new Camera(
			STAGE_PADDING + STAGE_MID_POINT - SCENE_WIDTH / 2,
			16,
			this.fighters
		);

		this.shadows = this.fighters.map((fighter) => new Shadow(fighter));
	};

	addEntity = (EntityClass, ...args) => {
		const Entity = new EntityClass(...args, this.removeEntity);
		this.entities.push(Entity);
		return Entity;
	};

	// Either use arrow function as i keeps the 'this' reference of parent always and doesnt have own 'this'
	// Or use normal function and use this.removeEntity.bind(this)

	removeEntity = (entity) => {
		this.entities = this.entities.filter((thisEntity) => thisEntity !== entity);
	};

	updateEntities = (time, camera) => {
		for (const entity of this.entities) {
			entity.update(time, camera);
		}
	};

	updateOverlays = (time) => {
		this.overlays.map((overlay) => overlay.update(time));
	};

	update = (time) => {
		this.updateFighters(time);
		this.updateShadows(time);
		this.stage.update(time);
		this.updateEntities(time, this.camera);
		this.camera.update(time);
		this.updateOverlays(time);
	};

	drawFighters(context) {
		this.FighterDrawOrder.map((id) =>
			this.fighters[id].draw(context, this.camera)
		);
	}

	drawShadows(context) {
		this.shadows.map((shadow) => shadow.draw(context, this.camera));
	}

	drawEntities(context) {
		this.entities.map((entity) => entity.draw(context, this.camera));
	}

	drawOverlays(context) {
		this.overlays.map((overlay) => overlay.draw(context, this.camera));
	}

	draw = (context) => {
		this.stage.drawBackground(context, this.camera);
		this.drawShadows(context);
		this.drawFighters(context);
		this.drawEntities(context);
		this.stage.drawForeground(context, this.camera);
		this.drawOverlays(context);
	};
}
