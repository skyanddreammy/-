const LEVELS = [
    {
        id: 1,
        name: "新手训练",
        description: "在简单环境中学习基本操作",
        targetKills: 3,
        npcCount: 2,
        difficulty: 1,
        map: [
            // 中心十字形
            { type: 'wall', x: 380, y: 100, width: 40, height: 400 },
            { type: 'wall', x: 200, y: 280, width: 400, height: 40 },
            // 角落掩体
            { type: 'wall', x: 100, y: 100, width: 60, height: 60 },
            { type: 'wall', x: 640, y: 100, width: 60, height: 60 },
            { type: 'wall', x: 100, y: 440, width: 60, height: 60 },
            { type: 'wall', x: 640, y: 440, width: 60, height: 60 }
        ],
        npcConfig: {
            speed: 2,
            shootInterval: 1500,
            health: 80
        }
    },
    {
        id: 2,
        name: "丛林迷宫",
        description: "在迷宫般的地形中与敌人周旋",
        targetKills: 5,
        npcCount: 3,
        difficulty: 1.5,
        map: [
            // 迷宫式布局
            { type: 'wall', x: 100, y: 100, width: 40, height: 200 },
            { type: 'wall', x: 100, y: 100, width: 200, height: 40 },
            { type: 'wall', x: 500, y: 100, width: 40, height: 200 },
            { type: 'wall', x: 300, y: 300, width: 200, height: 40 },
            { type: 'wall', x: 100, y: 400, width: 200, height: 40 },
            { type: 'wall', x: 500, y: 400, width: 200, height: 40 }
        ],
        npcConfig: {
            speed: 3,
            shootInterval: 1200,
            health: 100
        }
    },
    {
        id: 3,
        name: "城市战役",
        description: "在城市环境中击败7个敌人",
        targetKills: 7,
        npcCount: 3,
        difficulty: 2,
        map: [
            { type: 'wall', x: 100, y: 100, width: 40, height: 150 },
            { type: 'wall', x: 300, y: 200, width: 40, height: 150 },
            { type: 'wall', x: 500, y: 300, width: 40, height: 150 },
            { type: 'wall', x: 200, y: 400, width: 150, height: 40 },
            { type: 'wall', x: 400, y: 150, width: 150, height: 40 }
        ],
        npcConfig: {
            speed: 3.5,
            shootInterval: 1000,
            health: 120
        }
    },
    {
        id: 4,
        name: "精英挑战",
        description: "击败10个精英敌人",
        targetKills: 10,
        npcCount: 4,
        difficulty: 2.5,
        map: [
            { type: 'wall', x: 150, y: 100, width: 40, height: 200 },
            { type: 'wall', x: 350, y: 200, width: 40, height: 200 },
            { type: 'wall', x: 550, y: 300, width: 40, height: 200 },
            { type: 'wall', x: 200, y: 150, width: 200, height: 40 },
            { type: 'wall', x: 400, y: 350, width: 200, height: 40 },
            { type: 'wall', x: 100, y: 450, width: 200, height: 40 }
        ],
        npcConfig: {
            speed: 4,
            shootInterval: 800,
            health: 150
        }
    }
]; 