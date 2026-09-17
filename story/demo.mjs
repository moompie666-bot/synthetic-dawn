// v0.2 editorial edition. New dialogue is not a reconstruction of missing Ren'Py text.
// Every stable ID is authored explicitly; inserting a line never renumbers saves.
export function createStory(legacy, assets) {
  const nodes = {};
  const s = (id, speaker, text) => ({
    id,
    type: "say",
    speaker,
    text,
    provenance: "v0.2-revision",
  });
  const old = (id, file, line) => {
    const n = legacy.nodes.find(
      (n) => n.file === file && n.line === line && n.type === "say",
    );
    if (!n) throw new Error(`Missing legacy quotation ${file}:${line}`);
    return {
      ...s(id, n.speaker, n.text.replace(/\{[^}]+\}/g, "")),
      provenance: { version: "0.1", file, line },
    };
  };
  const actor = (
    character,
    costume = "default",
    slot = "right",
    expression = "neutral",
    pose = "standing",
  ) => ({ character, costume, slot, expression, pose });
  const sc = (id, chapter, bg, sprites = [], ambience = "rain", cg = null) => ({
    id,
    type: "scene",
    chapter,
    art: { bg, sprites, cg },
    audio: { music: ambience === "lab" ? null : "machina", ambience },
  });
  const e = (id, effects) => ({ id, type: "effect", effects });
  const q = (id, prompt, options) => ({ id, type: "choice", prompt, options });
  const o = (id, text, target, effects = {}, when = null, hint = "") => ({
    id,
    text,
    target,
    effects,
    when,
    hint,
  });
  const b = (id, when, yes, no) => ({ id, type: "branch", when, yes, no });
  const seq = (list, exit) =>
    list.forEach((n, i) => {
      if (nodes[n.id]) throw new Error("Duplicate node " + n.id);
      if (!["choice", "branch", "end"].includes(n.type))
        n.next = list[i + 1]?.id || exit;
      nodes[n.id] = n;
    });
  const flag = (name, equals = true) => ({ flag: name, equals });

  seq([
    sc("wake.scene", "awakening", "lab_dark", [], "lab"),
    s(
      "wake.boot",
      "system_voice",
      "视觉校准完成。听觉、触觉、运动功能正常。身份确认：SD-7749。",
    ),
    old("wake.light", "script.rpy", 58),
    old("wake.glass", "script.rpy", 66),
    old("wake.touch", "script.rpy", 73),
    s(
      "wake.screen",
      "narrator",
      "舱门旁的屏幕闪了一下。你的编号下面，先出现“回收完成”，随后才变成“首次启动”。",
    ),
    s(
      "wake.door",
      "narrator",
      "你还没看清时间，门外已经响起脚步声。一个穿制服的男人停在玻璃前，把那行记录关掉了。",
    ),
    sc(
      "wake.zhao",
      "awakening",
      "lab_dark",
      [actor("director_zhao", "default", "right", "watchful")],
      "lab",
    ),
    old("wake.zhao-name", "chapter_01.rpy", 27),
    s("wake.ask", "director_zhao", "抬起右手。现在，告诉我你的编号。"),
    q("wake.response", "他等着你回答。", [
      o("name", "“在回答之前……我有名字吗？”", "wake.name", {
        flags: { asked_name: true },
        relations: { zhao: -1 },
      }),
      o("comply", "按要求回答编号，先观察他。", "wake.comply", {
        flags: { asked_name: false },
        relations: { zhao: 1 },
      }),
    ]),
  ]);
  seq(
    [
      s("wake.name", "aria", "编号是你们给我的。名字也要由你们决定吗？"),
      s("wake.name-answer", "director_zhao", "名字不影响登记。你可以自己选。"),
      s("wake.name-aria", "aria", "那就叫我艾莉亚。"),
      s(
        "wake.name-note",
        "narrator",
        "他在终端上加了一条备注。你听见按键声，却看不见他写了什么。",
      ),
    ],
    "wake.release",
  );
  seq(
    [
      s("wake.comply", "aria", "SD-7749。"),
      s(
        "wake.comply-look",
        "narrator",
        "他低头记录。你趁这个间隙看向屏幕边缘：上一条日志已被锁定。",
      ),
      s(
        "wake.comply-name",
        "director_zhao",
        "登记名是艾莉亚。如果有人问起，就用这个。",
      ),
      s("wake.comply-self", "aria", "艾莉亚。……好。"),
    ],
    "wake.release",
  );
  seq([
    s(
      "wake.release",
      "director_zhao",
      "你有一天的社会适应期。下午到管理局报到。不要尝试拆除后颈的芯片。",
    ),
    s(
      "wake.leave",
      "narrator",
      "玻璃门打开。你踩上地面，膝盖晃了一下。他没有伸手，等你自己站稳。",
    ),
    e("wake.cg", { cg: ["cg_ch01_01_awakening"] }),
    sc("street.scene", "street", "city_day", [], "city"),
    old("street.first", "chapter_01.rpy", 128),
    s(
      "street.sign",
      "narrator",
      "街角的广告教人辨认仿生人：看后颈的标识。你把衣领往上拉了拉。",
    ),
    s(
      "street.vendor",
      "narrator",
      "早餐摊的热气钻进衣领。摊主把一杯热水推过来，看到你的编号，又收回了杯子。",
    ),
    s("street.vendor-response", "aria", "我只是想知道，它为什么会冒烟。"),
    s(
      "street.vendor-silence",
      "narrator",
      "他没回答。你记住了那只杯子在柜台上留下的水圈。",
    ),
    s(
      "street.reclaim",
      "narrator",
      "两名回收员把一个仿生人按在车门上。他的手抓着一袋橘子，袋底破了，橘子滚到了你的鞋边。",
    ),
    s(
      "street.request",
      "unknown_android",
      "能不能……别踩它。那是给楼上孩子带的。",
    ),
    s(
      "street.scan",
      "system_voice",
      "近距标识：SD-4521。状态：异常。建议保持距离。",
    ),
    q("street.choice", "回收车的门正在合拢。", [
      o("remember", "记住 SD-4521 和车牌，留在原地。", "street.remember", {
        flags: { number_saved: true },
        clues: ["number"],
      }),
      o("help", "捡起橘子，走过去要求他们停一下。", "street.help", {
        flags: { helped_android: true },
        relations: { kai: 1 },
      }),
      o("leave", "离开街口，避免被扫描。", "street.leave", {
        flags: { stayed_hidden: true },
      }),
    ]),
  ]);
  seq(
    [
      s(
        "street.remember",
        "narrator",
        "你默念了三遍编号。车牌最后一位被泥挡住，你只记下“七区／转运 06”。",
      ),
      s(
        "street.remember-hand",
        "narrator",
        "车门合上前，里面的人把手掌贴在窗上。你抬了抬手，不知道他有没有看见。",
      ),
    ],
    "office.scene",
  );
  seq(
    [
      s("street.help", "aria", "他的东西掉了。让他拿回去。"),
      s(
        "street.help-officer",
        "narrator",
        "回收员推开你的手。一个橘子掉进水沟，另一个被你攥得发软。",
      ),
      s(
        "street.help-warning",
        "system_voice",
        "警告：管理芯片已记录越界接触。",
      ),
      s(
        "street.help-kai",
        "narrator",
        "对街一个男人向你摇头。他趁回收员回身时捡起袋子，消失在人群里。",
      ),
    ],
    "office.scene",
  );
  seq(
    [
      s(
        "street.leave",
        "narrator",
        "你拐进另一条街。靴底碾过橘子的声音被车流盖住。",
      ),
      s("street.leave-question", "aria", "如果我也被带走，会有人停下来吗？"),
    ],
    "office.scene",
  );
  seq([
    sc(
      "office.scene",
      "commission",
      "office_zhao_dark",
      [actor("director_zhao", "meeting")],
      "lab",
    ),
    s(
      "office.chip",
      "director_zhao",
      "特别授权芯片。你今晚会去地下酒吧，接触一个叫莉拉的人。回来后，把你听到的告诉我。",
    ),
    s("office.why", "aria", "为什么是我？"),
    old("office.trust", "chapter_01.rpy", 239),
    s(
      "office.packet",
      "narrator",
      "他把芯片推到桌边。你注意到终端右下角还开着一份回收清单。",
    ),
    b(
      "office.recognition",
      flag("number_saved"),
      "office.known",
      "office.unknown",
    ),
  ]);
  seq(
    [
      s(
        "office.known",
        "narrator",
        "SD-4521。你认出了街上那个人的编号。清单写着：昨日 23:40，回收完成。",
      ),
      s("office.known-time", "aria", "昨天？可是我今天早上才见过他。"),
      e("office.record", {
        clues: ["record"],
        flags: { discrepancy_known: true },
      }),
    ],
    "office.decision",
  );
  seq(
    [
      s(
        "office.unknown",
        "narrator",
        "一排排编号，后面都是同一行“回收完成”。其中一条昨夜的记录，今天又添了一次转运。",
      ),
      s("office.unknown-thought", "aria", "同一个人……为什么要回收两次？"),
      e("office.partial", { clues: ["transfer"] }),
    ],
    "office.decision",
  );
  seq([
    q("office.decision", "你准备怎样应对这份委托？", [
      o("ask", "指出日期矛盾，要求解释。", "office.ask", {
        flags: { challenged_zhao: true },
        relations: { zhao: -1 },
      }),
      o("copy", "接下芯片，趁连接时复制清单。", "office.copy", {
        flags: { evidence_copied: true },
        clues: ["record"],
      }),
      o("obey", "接下芯片，暂时不碰清单。", "office.obey", {
        flags: { obeyed: true },
        relations: { zhao: 1 },
      }),
    ]),
  ]);
  seq(
    [
      s(
        "office.ask",
        "director_zhao",
        "“回收”是行政状态。你在街上看见的，是尚未入库的载体。",
      ),
      s("office.ask-person", "aria", "那里面还有人在说话。"),
      s(
        "office.ask-answer",
        "director_zhao",
        "所以你需要适应期。先学会分清记录和感受。",
      ),
      s(
        "office.ask-chip",
        "narrator",
        "他关掉清单。芯片仍放在你面前。你把它收进口袋，没有植入。",
      ),
      e("office.ask-fact", { clues: ["transfer"] }),
    ],
    "alley.scene",
  );
  seq(
    [
      s(
        "office.copy",
        "narrator",
        "芯片贴上接口的一瞬间，你把清单拖进了本地缓存。屏幕上闪过另一个编号：SD-7749。",
      ),
      s("office.copy-self", "aria", "我也在名单里。"),
      s("office.copy-zhao", "director_zhao", "连接完成了吗？"),
      s("office.copy-lie", "aria", "完成了。"),
      e("office.copy-clue", { clues: ["own-record"] }),
    ],
    "alley.scene",
  );
  seq(
    [
      s("office.obey", "director_zhao", "明智。授权会让你少遇到很多麻烦。"),
      s(
        "office.obey-card",
        "narrator",
        "你把芯片留在封套里。封套写着：持有者的位置会同步至七区管理局。",
      ),
      s(
        "office.obey-think",
        "aria",
        "被允许进入，和被允许离开，是同一回事吗？",
      ),
    ],
    "alley.scene",
  );
  seq([
    sc(
      "alley.scene",
      "encounter",
      "alley_rain",
      [actor("kai", "default")],
      "rain",
    ),
    s("alley.kai", "kai", "别往前走。下个路口有巡检。"),
    s("alley.who", "aria", "你一直在跟着我？"),
    s("alley.intro", "kai", "凯。早上在街口见过。你的口袋在发信号。"),
    b(
      "alley.callback",
      flag("helped_android"),
      "alley.help-memory",
      "alley.watch-memory",
    ),
  ]);
  seq(
    [
      s(
        "alley.help-memory",
        "kai",
        "那个袋子，我送到楼上了。孩子问叔叔什么时候回来。",
      ),
      s("alley.help-answer", "aria", "你怎么回答的？"),
      s(
        "alley.help-kai-answer",
        "kai",
        "我说还不知道。答应得太快，之后更难解释。",
      ),
    ],
    "alley.chip-choice",
  );
  seq(
    [
      s(
        "alley.watch-memory",
        "kai",
        "街口的人被带去了旧中转站。我今晚想把他弄出来。",
      ),
      s("alley.watch-why", "aria", "你认识他？"),
      s("alley.watch-answer", "kai", "不认识。不需要先认识。"),
    ],
    "alley.chip-choice",
  );
  seq([
    q("alley.chip-choice", "凯的目光停在你的口袋上。", [
      o("tell", "把管理局的委托告诉他。", "alley.tell", {
        flags: { disclosed_chip: true },
        relations: { kai: 1 },
      }),
      o("hide", "只说这是通行证，保留委托内容。", "alley.hide", {
        flags: { disclosed_chip: false },
      }),
    ]),
  ]);
  seq(
    [
      s("alley.tell", "aria", "他们让我接近莉拉，再回去汇报。"),
      s("alley.tell-answer", "kai", "那就先别带着它去见她。"),
      s(
        "alley.tell-wrap",
        "narrator",
        "他给你一个旧金属盒。芯片放进去后，耳边那一点电流声消失了。",
      ),
    ],
    "bar.scene",
  );
  seq(
    [
      s("alley.hide", "kai", "管理局的通行证不只会开门。你先留着，别急着用。"),
      s("alley.hide-look", "narrator", "他没有追问。你把封套捏紧了一点。"),
    ],
    "bar.scene",
  );
  seq([
    sc(
      "bar.scene",
      "bar",
      "underground_bar_night",
      [actor("aria", "default", "left"), actor("lyra", "bar")],
      "room",
    ),
    s(
      "bar.intro",
      "narrator",
      "酒吧没有招牌。莉拉正在给一台旧收音机接线，听见你进门，她把工具让到一旁。",
    ),
    s("bar.water", "lyra", "喝水吗？不喝也可以暖手。"),
    s("bar.cup", "narrator", "你接过杯子。这次，没有人把它收回去。"),
    s("bar.identity", "aria", "管理局说，我今天才第一次启动。"),
    s("bar.answer", "lyra", "你自己记得什么？"),
    s(
      "bar.memory",
      "aria",
      "记得一行被删掉的记录。还有一个本来已经“回收完成”，却仍然在说话的人。",
    ),
    s(
      "bar.statement",
      "lyra",
      "我收到过类似的清单。但只有编号，没有能作证的人。",
    ),
    s(
      "bar.offer",
      "lyra",
      "有人愿意开口，事情才有机会被看见。也可能让那个人更危险。",
    ),
    q("bar.evidence-choice", "你愿意向莉拉透露多少？", [
      o(
        "show",
        "让她看复制的记录，但要求保密。",
        "bar.show",
        { flags: { shared_record: true }, relations: { lyra: 1 } },
        { clue: "record" },
        "你保存的清单提供了依据",
      ),
      o("describe", "只描述街头发生的事。", "bar.describe", {
        flags: { shared_record: false },
      }),
      o("question", "先问她会怎样保护证人。", "bar.question", {
        flags: { asked_consent: true },
        relations: { lyra: 1 },
      }),
    ]),
  ]);
  seq(
    [
      s("bar.show", "lyra", "我不拍照，也不上传。你把屏幕拿着。"),
      s(
        "bar.show-match",
        "narrator",
        "她拿出另一张转运单，指向角落里的印章。两份记录用了同一个批准号。",
      ),
      s(
        "bar.show-question",
        "lyra",
        "这不是两个部门记错了。有人让它们按这个顺序发生。",
      ),
      e("bar.show-clue", { clues: ["seal"] }),
    ],
    "crossroads.scene",
  );
  seq(
    [
      s(
        "bar.describe",
        "lyra",
        "那就先从你亲眼看见的开始。别为了说服我，把猜测也算进去。",
      ),
      s(
        "bar.describe-remember",
        "narrator",
        "她听你讲完，没有打断。最后，她把“还能说话”四个字单独圈了出来。",
      ),
    ],
    "crossroads.scene",
  );
  seq(
    [
      s(
        "bar.question",
        "lyra",
        "以前我会说，藏好名字就够了。后来有人从录音里认出了说话的口音。",
      ),
      s("bar.question-now", "aria", "现在呢？"),
      s(
        "bar.question-answer",
        "lyra",
        "先问本人。然后把风险讲清楚。如果他不愿意，我们就换一种证据。",
      ),
    ],
    "crossroads.scene",
  );
  seq([
    sc("crossroads.scene", "crossroads", "rooftop_night", [], "rain"),
    s(
      "crossroads.night",
      "narrator",
      "凌晨一点，雨还没停。凯发来旧中转站的位置；莉拉问你是否愿意一起核实记录。",
    ),
    s(
      "crossroads.third",
      "narrator",
      "管理局的芯片还在你手里。它或许能打开那份锁住的日志，也会把你的行踪交出去。",
    ),
    s(
      "crossroads.goal",
      "aria",
      "我想知道，为什么有人在活着的时候，就已经被写成了“回收完成”。",
    ),
    e("crossroads.cg", { cg: ["cg_ch01_04_choice"] }),
    q("crossroads.choose", "这一次，你准备从哪里开始？", [
      o(
        "kai",
        "去旧中转站，和凯把人带出来。",
        "kai.scene",
        { route: "kai" },
        null,
        "救援：先让当事人活着离开",
      ),
      o(
        "lyra",
        "回酒吧，和莉拉核实并处理证据。",
        "lyra.scene",
        { route: "lyra" },
        null,
        "公开：让记录能够被追问",
      ),
      o(
        "wanderer",
        "使用芯片，独自查询自己的记录。",
        "solo.scene",
        { route: "wanderer" },
        null,
        "调查：查清你的名字为何在名单里",
      ),
    ]),
  ]);

  seq([
    sc(
      "kai.scene",
      "kai",
      "hideout_night",
      [actor("aria", "default", "left"), actor("kai", "casual")],
      "room",
    ),
    s(
      "kai.plan",
      "narrator",
      "凯在地图上画了两条线。一条穿过前门，一条绕进排水渠。桌边放着半袋没吃完的橘子。",
    ),
    s(
      "kai.target",
      "kai",
      "今晚只带一个人出来。别碰总控，也别想着顺手把整栋楼掀了。",
    ),
    s("kai.count", "aria", "如果里面还有别人呢？"),
    s("kai.answer", "kai", "把位置记下来。活着回来，才有下一次。"),
    b("kai.chip-check", flag("disclosed_chip"), "kai.trust", "kai.distrust"),
  ]);
  seq(
    [
      s("kai.trust", "kai", "你在巷子里就把委托告诉我了。所以撤退路线也给你。"),
      s(
        "kai.trust-map",
        "narrator",
        "他把备用钥匙推过来。你发现背面刻了一个很小的名字，已经磨得看不清。",
      ),
    ],
    "kai.entry",
  );
  seq(
    [
      s(
        "kai.distrust",
        "kai",
        "开工之前，把那张“通行证”拿出来。它一分钟前又发了一次信号。",
      ),
      s("kai.distrust-aria", "aria", "我没告诉你全部。"),
      s(
        "kai.distrust-answer",
        "kai",
        "现在告诉也来得及。撤退路线先由我保管。不是惩罚，我得知道风险在哪。",
      ),
    ],
    "kai.entry",
  );
  seq([
    sc("kai.entry", "kai", "alley_night", [actor("kai", "default")], "rain"),
    s(
      "kai.entrance",
      "narrator",
      "中转站的门只开一条缝。值班员隔着玻璃问你们要转运编号。",
    ),
    q("kai.entry-choice", "怎样进去？", [
      o(
        "number",
        "报出 SD-4521，要求核对重复转运。",
        "kai.number",
        { flags: { kai_quiet: true } },
        { clue: "number" },
        "街口记下的编号派上了用场",
      ),
      o("drain", "跟凯走排水渠，避开前台。", "kai.drain", {
        flags: { kai_quiet: false },
      }),
      o("permit", "用授权芯片打开前门。", "kai.permit", {
        flags: { kai_quiet: false, permit_used: true },
      }),
    ]),
  ]);
  seq(
    [
      s(
        "kai.number",
        "narrator",
        "值班员查了两次，眉头越皱越紧。他转身去找主管，没有把窗口关上。",
      ),
      s("kai.number-kai", "kai", "就是现在。"),
      s(
        "kai.number-through",
        "narrator",
        "你们穿过货物通道。凯扶住即将撞响的铁门，让你先过去。",
      ),
    ],
    "kai.find",
  );
  seq(
    [
      s(
        "kai.drain",
        "narrator",
        "水淹到腰侧。凯用外套包住锈掉的栅栏，怕金属摩擦声传进去。",
      ),
      s(
        "kai.drain-cut",
        "narrator",
        "他的肩膀被断口划开。你伸手时，他示意你先看守卫的方向。",
      ),
      s("kai.drain-answer", "kai", "等出去再算这件衣服的钱。"),
    ],
    "kai.find",
  );
  seq(
    [
      s("kai.permit", "system_voice", "特别授权已确认。通行日志已上传。"),
      s("kai.permit-kai", "kai", "门开了，后面也知道你来了。我们只有几分钟。"),
      s(
        "kai.permit-run",
        "narrator",
        "你收起芯片。走廊尽头，第二道门开始缓慢下降。",
      ),
    ],
    "kai.find",
  );
  seq([
    sc("kai.find", "kai", "lab_bright", [actor("kai", "default")], "lab"),
    s(
      "kai.person",
      "narrator",
      "SD-4521坐在一排空椅子中间。他的手还保持着提袋子的姿势。",
    ),
    s("kai.person-name", "unknown_android", "我叫林。楼上的孩子……"),
    s("kai.person-answer", "kai", "东西送到了。现在你自己回去告诉他。"),
    s(
      "kai.lock",
      "narrator",
      "固定环没有锁住他的腿，却锁住了电源。拔掉接口，他可能再也醒不过来。墙上的终端正在同步记忆。",
    ),
    q("kai.rescue-choice", "解除固定需要时间。你准备怎么分工？", [
      o("stay", "让凯看门，自己逐步解除同步。", "kai.stay", {
        flags: { kai_memory: true },
      }),
      o("carry", "切断接口，把人先带出去。", "kai.carry", {
        flags: { kai_memory: false },
      }),
      o(
        "cover",
        "把备用钥匙交给凯，让他带人走；自己引开守卫。",
        "kai.cover",
        { flags: { kai_memory: true, kai_diversion: true } },
        flag("disclosed_chip"),
        "凯把撤退路线交给过你",
      ),
    ]),
  ]);
  seq(
    [
      s(
        "kai.stay",
        "narrator",
        "你一项项解除同步。屏幕上的百分比退得很慢，门外已经传来询问声。",
      ),
      s("kai.stay-question", "aria", "凯，还能撑多久？"),
      s("kai.stay-answer", "kai", "你别回头。我会告诉你什么时候跑。"),
      s(
        "kai.stay-done",
        "narrator",
        "固定环松开。林叫出自己的名字，像是在确认它还在。",
      ),
    ],
    "kai.exit",
  );
  seq(
    [
      s(
        "kai.carry",
        "narrator",
        "接口断开的瞬间，林浑身一颤。凯接住他，你拿起掉落的记录卡。",
      ),
      s("kai.carry-cost", "aria", "他还能醒过来吗？"),
      s("kai.carry-answer", "kai", "先出去。之后我们一起想办法。"),
      s(
        "kai.carry-remains",
        "narrator",
        "林醒了片刻。他记得楼上有个孩子，却想不起自己为什么要回去。",
      ),
    ],
    "kai.exit",
  );
  seq(
    [
      s("kai.cover", "kai", "到桥下见。你晚了，我会回来。"),
      s(
        "kai.cover-act",
        "narrator",
        "你把芯片贴在另一侧的门上，让警报跟着你跑。凯背起林，从备用出口消失。",
      ),
      s(
        "kai.cover-stop",
        "narrator",
        "你冲进雨里，直到身后的感应灯一盏盏熄灭，才敢停下。",
      ),
    ],
    "kai.exit",
  );
  seq([
    sc("kai.exit", "kai", "safehouse_night", [actor("kai", "wounded")], "room"),
    s(
      "kai.safe",
      "narrator",
      "安全屋的灯坏了一半。凯把林安顿在折叠床上，自己坐在门边，终于松开捂住肩膀的手。",
    ),
    s("kai.safe-aria", "aria", "先让我看看伤口。"),
    s("kai.safe-joke", "kai", "你先前还说不认识我。"),
    s("kai.safe-answer", "aria", "现在认识了。"),
    b(
      "kai.memory-check",
      flag("kai_memory"),
      "kai.memory-kept",
      "kai.memory-lost",
    ),
  ]);
  seq(
    [
      s(
        "kai.memory-kept",
        "unknown_android",
        "他们让我签字，证明我同意重置。我没签。",
      ),
      s("kai.memory-signed", "aria", "可是记录上……"),
      s("kai.memory-witness", "unknown_android", "记录上，昨天就已经签好了。"),
      e("kai.memory-clue", { clues: ["testimony"] }),
    ],
    "kai.close",
  );
  seq(
    [
      s(
        "kai.memory-lost",
        "narrator",
        "林把那张记录卡来回翻了很久。他知道卡上的字与自己有关，却接不上任何画面。",
      ),
      s(
        "kai.memory-promise",
        "aria",
        "我们会找回剩下的部分。不是现在逼你想起来。",
      ),
      s("kai.memory-nod", "narrator", "他点点头，把卡交给你。"),
      e("kai.memory-card", { clues: ["record-card"] }),
    ],
    "kai.close",
  );
  seq([
    s(
      "kai.close",
      "kai",
      "今晚先到这里。你把一个人带出来了。明天要怎么做，明天再争。",
    ),
    s(
      "kai.envelope",
      "narrator",
      "天亮前，有人从门缝塞进一个信封。没有地址，里面只有一张旧照片。",
    ),
    s(
      "kai.photo",
      "narrator",
      "照片上，凯站在实验室门口。你站在他旁边。背面的日期，是三年前。",
    ),
    s("kai.hook", "aria", "凯。你说我们是今天才认识的。"),
    e("kai.unlock", { cg: ["cg_ch02_kai_02", "cg_ch02_kai_05"] }),
    {
      id: "kai.end",
      type: "end",
      kind: "demo",
      title: "有人走出了名单",
      summary:
        "旧中转站的救援结束了。林还活着，而你与凯的关系，也有了无法绕开的问题。",
      hook: "三年前的照片上，为什么已经有你？",
      recap: [
        {
          when: flag("kai_memory"),
          text: "你保住了林的记忆，留下一个能够作证的人。",
        },
        {
          when: flag("kai_memory", false),
          text: "你选择先救出林；缺失的记忆仍需要寻找。",
        },
        {
          when: flag("disclosed_chip"),
          text: "你坦白了芯片的用途，凯把撤退路线交给了你。",
        },
      ],
    },
  ]);

  seq([
    sc(
      "lyra.scene",
      "lyra",
      "underground_bar_night",
      [actor("aria", "default", "left"), actor("lyra", "bar")],
      "room",
    ),
    s(
      "lyra.night",
      "narrator",
      "莉拉把酒吧的灯关掉一半，留出靠窗的一桌。桌上是她收集的转运单，还有你刚才用过的杯子。",
    ),
    s(
      "lyra.witness",
      "lyra",
      "有位维修员愿意提供记录。她不想露脸，也不想让同事知道。",
    ),
    s("lyra.plan", "aria", "你准备把它们发出去？"),
    s("lyra.response", "lyra", "我想。但想做，不代表已经有权替她决定。"),
    b(
      "lyra.callback",
      flag("asked_consent"),
      "lyra.consent-memory",
      "lyra.cup-memory",
    ),
  ]);
  seq(
    [
      s(
        "lyra.consent-memory",
        "lyra",
        "你刚才问怎么保护证人，我一直记着。今晚由你来问她，好吗？",
      ),
      s(
        "lyra.consent-answer",
        "aria",
        "我会把风险说清楚。也包括我们还不知道的部分。",
      ),
    ],
    "lyra.evidence",
  );
  seq(
    [
      s(
        "lyra.cup-memory",
        "lyra",
        "你拿杯子的时候，看了我两次。是怕我收回去吗？",
      ),
      s("lyra.cup-answer", "aria", "早上有人那样做过。"),
      s("lyra.cup-keep", "lyra", "这只留给你。明天来的时候，还在。"),
    ],
    "lyra.evidence",
  );
  seq([
    s(
      "lyra.evidence",
      "narrator",
      "维修员通过变声通话接入。她说自己只修过设备，不知道清单上的人后来去了哪里。",
    ),
    s(
      "lyra.verify",
      "unknown_android",
      "你们怎么证明不是有人把日期改了？我不能为了猜测，让整个班组被查。",
    ),
    q("lyra.verify-choice", "你用什么说服她继续核实？", [
      o(
        "record",
        "对照管理局的原始清单与批准号。",
        "lyra.record",
        { flags: { verified_record: true }, clues: ["seal"] },
        { clue: "record" },
        "你保留的文件能够交叉核对",
      ),
      o("request", "承认现有证据不够，请她只查设备日志。", "lyra.request", {
        flags: { verified_record: false },
      }),
      o("anonymity", "先约定匿名方式，再谈她能提供什么。", "lyra.anonymity", {
        flags: { lyra_consent: true },
      }),
    ]),
  ]);
  seq(
    [
      s(
        "lyra.record",
        "narrator",
        "批准号一致。设备日志里的时间戳也一致。维修员沉默了一会儿，把第三份记录传了过来。",
      ),
      s(
        "lyra.record-answer",
        "unknown_android",
        "这份能证明，签字时那个人根本不在现场。",
      ),
      e("lyra.record-clue", { clues: ["consent-log"] }),
    ],
    "lyra.interview",
  );
  seq(
    [
      s(
        "lyra.request",
        "unknown_android",
        "这个我可以查。别写成“维修员证实”，我只能证明设备当时在运行。",
      ),
      s("lyra.request-answer", "aria", "好。我们只写你能证明的部分。"),
      e("lyra.request-clue", { clues: ["machine-log"] }),
    ],
    "lyra.interview",
  );
  seq(
    [
      s(
        "lyra.anonymity",
        "aria",
        "不保留声音，不公开班次。你可以在发布前撤回。",
      ),
      s(
        "lyra.anonymity-answer",
        "unknown_android",
        "那我愿意给你们看完整日志。但别把同事的名字带出去。",
      ),
      e("lyra.anonymity-clue", { clues: ["consent-log"] }),
    ],
    "lyra.interview",
  );
  seq([
    s(
      "lyra.interview",
      "narrator",
      "通话结束后，莉拉把公开稿推到你面前。她删掉了最有冲击力的一段声音。",
    ),
    s("lyra.interview-ask", "aria", "你不觉得可惜吗？"),
    s(
      "lyra.interview-answer",
      "lyra",
      "觉得。所以才要在舍不得的时候，看看她答应过什么。",
    ),
    s(
      "lyra.warning",
      "narrator",
      "楼上有人急促地敲门：管理局开始排查这一带的网络。今晚再等，窗口可能就关了。",
    ),
    q("lyra.publish-choice", "公开稿还差最后一个决定。", [
      o("redact", "删除可识别信息，只公开核实过的记录。", "lyra.redact", {
        flags: { lyra_redacted: true, lyra_published: true },
      }),
      o("delay", "暂缓公开，先让证人离开原住处。", "lyra.delay", {
        flags: { lyra_redacted: true, lyra_published: false },
      }),
      o(
        "full",
        "公开完整批准链，但隐去所有个人信息。",
        "lyra.full",
        {
          flags: {
            lyra_redacted: true,
            lyra_published: true,
            full_chain: true,
          },
        },
        { all: [{ clue: "seal" }, { clue: "consent-log" }] },
        "两份独立记录已交叉核实",
      ),
    ]),
  ]);
  seq(
    [
      s(
        "lyra.redact",
        "narrator",
        "你们逐项检查文件里的姓名、声音和设备标记。删减后的稿子很短，只剩几条能被复核的事实。",
      ),
      s("lyra.redact-answer", "lyra", "够了。让他们回答这些。"),
      s(
        "lyra.redact-post",
        "narrator",
        "第一份镜像出现，随后是第二份。有人提出质疑，也有人贴出了另一张日期矛盾的清单。",
      ),
    ],
    "lyra.after",
  );
  seq(
    [
      s("lyra.delay", "aria", "今晚少一篇稿子，她明天还能提供证据。"),
      s("lyra.delay-answer", "lyra", "我去安排住处。你把文件断网保存。"),
      s(
        "lyra.delay-act",
        "narrator",
        "你们没有按下发布键。凌晨，维修员发来一张空房间的照片：她已经安全离开。",
      ),
    ],
    "lyra.after",
  );
  seq(
    [
      s(
        "lyra.full",
        "narrator",
        "记录、批准号、设备时间戳依次出现在屏幕上。你们留下可供复核的链条，删除了每一个可能指向证人的细节。",
      ),
      s("lyra.full-result", "lyra", "这样他们不能只用一句“系统错误”回答了。"),
      s(
        "lyra.full-message",
        "narrator",
        "一名记者发来回复：愿意继续核实，请保存原件。",
      ),
    ],
    "lyra.after",
  );
  seq([
    sc(
      "lyra.after",
      "lyra",
      "rooftop_night",
      [actor("lyra", "default")],
      "rain",
    ),
    s(
      "lyra.roof",
      "narrator",
      "莉拉带你上屋顶透气。雨停了，楼下的广告还在反复播放同一句“安全的明天”。",
    ),
    s("lyra.doubt", "aria", "一份记录，能改变什么？"),
    s("lyra.small", "lyra", "还不知道。但至少，今晚我们没有替别人签字。"),
    s(
      "lyra.receipt",
      "narrator",
      "终端忽然收到一份回执。发件人没有名字，附件是一段被截断的核心日志。",
    ),
    s(
      "lyra.own-sign",
      "system_voice",
      "授权操作人：SD-7749。签署时间：三年前。",
    ),
    s("lyra.deny", "aria", "我没签过。"),
    s("lyra.hook", "lyra", "我相信现在的你。我们要找到当时的你。"),
    e("lyra.unlock", {
      cg: ["cg_ch02_lyra_02", "cg_ch02_lyra_05"],
      clues: ["old-signature"],
    }),
    {
      id: "lyra.end",
      type: "end",
      kind: "demo",
      title: "留下可以追问的证据",
      summary:
        "你们完成了证据核实，也为证人的安全作出了选择。新的回执，却把问题指向了你自己。",
      hook: "那份三年前的授权，为什么使用了你的签名？",
      recap: [
        {
          when: flag("lyra_published"),
          text: "你们公开了可复核的记录，隐去了证人身份。",
        },
        {
          when: flag("lyra_published", false),
          text: "你们暂缓公开，先护送证人离开。",
        },
        {
          when: flag("full_chain"),
          text: "你保留的清单补全了批准链，让质疑有据可查。",
        },
      ],
    },
  ]);

  seq([
    sc("solo.scene", "solo", "office_zhao_night", [], "lab"),
    s(
      "solo.return",
      "narrator",
      "你回到管理局。夜班接待处空着，只有一盏台灯。芯片打开了侧门，也在屏幕上留下你的编号。",
    ),
    s(
      "solo.query",
      "system_voice",
      "请选择查询范围：设备状态，转运记录，个人档案。",
    ),
    s(
      "solo.notice",
      "narrator",
      "警示写得很清楚：每次查询都将记录身份。你没有看见“访客模式”。",
    ),
    q("solo.query-choice", "你只来得及先查一项。", [
      o(
        "number",
        "查询 SD-4521 的完整转运记录。",
        "solo.number",
        { flags: { solo_target: "number" } },
        { clue: "number" },
        "你记得街口的编号",
      ),
      o("self", "查询自己的个人档案。", "solo.self", {
        flags: { solo_target: "self" },
      }),
      o("device", "查询启动舱的设备日志。", "solo.device", {
        flags: { solo_target: "device" },
      }),
    ]),
  ]);
  seq(
    [
      s(
        "solo.number",
        "narrator",
        "档案显示，SD-4521在“回收完成”后被转运了三次。每次都需要一个尚未回收的活体确认。",
      ),
      s("solo.number-name", "aria", "他们需要他活着，却不允许他在记录里活着。"),
      e("solo.number-clue", {
        clues: ["routing"],
        flags: { solo_understood: true },
      }),
    ],
    "solo.challenge",
  );
  seq(
    [
      s(
        "solo.self",
        "narrator",
        "你的档案有三个版本。第一页写着“首次启动”，后两页只有日期，没有正文。",
      ),
      s("solo.self-mark", "system_voice", "历史版本访问需要管理者复核。"),
      s("solo.self-answer", "aria", "连我自己的过去，也要别人批准。"),
      e("solo.self-clue", { clues: ["own-record"] }),
    ],
    "solo.challenge",
  );
  seq(
    [
      s(
        "solo.device",
        "narrator",
        "启动舱的运行记录没有被删。三年前，它校准过一次与你完全一致的神经映射。",
      ),
      s("solo.device-time", "aria", "设备不会记得我。但它留下了时间。"),
      e("solo.device-clue", { clues: ["machine-log"] }),
    ],
    "solo.challenge",
  );
  seq([
    s("solo.challenge", "system_voice", "检测到异常查询。值班负责人已接入。"),
    sc(
      "solo.zhao-scene",
      "solo",
      "office_zhao_night",
      [actor("director_zhao", "offduty")],
      "lab",
    ),
    s("solo.zhao", "director_zhao", "我以为你会带着酒吧的消息回来。"),
    s("solo.aria", "aria", "我想先知道，我回来过多少次。"),
    b(
      "solo.callback",
      flag("asked_name"),
      "solo.name-memory",
      "solo.number-memory",
    ),
  ]);
  seq(
    [
      s(
        "solo.name-memory",
        "director_zhao",
        "早上你要自己取名字。现在又要以前的记录。你知道这两件事可能冲突吗？",
      ),
      s("solo.name-answer", "aria", "冲突也该由我看见。"),
    ],
    "solo.offer",
  );
  seq(
    [
      s(
        "solo.number-memory",
        "director_zhao",
        "你早上回答编号时没有犹豫。我以为这一次会容易一些。",
      ),
      s("solo.number-answer", "aria", "“这一次”？你已经回答了我的一半问题。"),
    ],
    "solo.offer",
  );
  seq([
    s(
      "solo.offer",
      "director_zhao",
      "交回芯片，接受一次完整复核。我会让你看得到的部分，尽可能多。",
    ),
    s(
      "solo.risk",
      "narrator",
      "复核条款在终端上展开：“允许隔离；允许关闭外部联系；允许重置异常记忆。”",
    ),
    q("solo.offer-choice", "赵局长等着你签署。", [
      o(
        "named-copy",
        "以自己取的名字申请一页离线副本，拒绝记忆复核。",
        "solo.named-request",
        { flags: { solo_boundary: true, solo_owned_copy: true } },
        flag("asked_name"),
        "你曾争取过自己命名的权利",
      ),
      o("negotiate", "只同意离线查看，拒绝记忆重置。", "solo.negotiate", {
        flags: { solo_boundary: true },
      }),
      o("leave", "复制现有结果，终止查询并离开。", "solo.leave", {
        flags: { solo_boundary: false },
      }),
      o(
        "sign",
        "接受完整复核，包括隔离与记忆重置。",
        "solo.sign",
        {},
        null,
        "明确风险：这会结束本次调查，可回退重选",
      ),
    ]),
  ]);
  seq(
    [
      s(
        "solo.named-request",
        "aria",
        "早上你说，名字可以自己选。那么我现在以艾莉亚的名义申请副本。不是作为一个等你复核的编号。",
      ),
      s(
        "solo.named-answer",
        "director_zhao",
        "……只给这一页。离线签收，芯片留下。",
      ),
      s(
        "solo.named-page",
        "narrator",
        "打印口吐出一张薄纸。你在签收栏写下自己的名字，把写着“不要相信下一次启动”的那一页折进口袋。",
      ),
      e("solo.named-clue", { clues: ["warning", "own-record"] }),
    ],
    "solo.street",
  );
  seq(
    [
      s("solo.negotiate", "aria", "你可以在场。我不连接主机，不交出记忆。"),
      s("solo.negotiate-zhao", "director_zhao", "你开始学会谈条件了。"),
      s(
        "solo.negotiate-reply",
        "aria",
        "因为你需要我自己签字。否则你早就做了。",
      ),
      s(
        "solo.negotiate-page",
        "narrator",
        "他解锁了一页旧记录，没有把终端转得离你更近。你仍然看清了末尾的手写备注：不要相信下一次启动。",
      ),
      e("solo.negotiate-clue", { clues: ["warning"] }),
    ],
    "solo.street",
  );
  seq(
    [
      s(
        "solo.leave",
        "director_zhao",
        "离开之后，我不能保证你的通行权限仍然有效。",
      ),
      s("solo.leave-answer", "aria", "我知道。"),
      s(
        "solo.leave-door",
        "narrator",
        "你拔出芯片，在权限变灰前穿过侧门。身后没有追赶声。这比有人追来更让你不安。",
      ),
    ],
    "solo.street",
  );
  seq([
    s(
      "solo.sign",
      "narrator",
      "你按下确认。终端熄灭，门锁闭合。最后一行提示是“感谢配合”。",
    ),
    s("solo.sign-last", "aria", "至少……把我刚才查到的留下。"),
    s(
      "solo.sign-silence",
      "narrator",
      "没人回答。你的请求进入队列，然后被标记为已处理。",
    ),
    e("solo.bad-cg", { cg: ["cg_badend_reclaim"] }),
    {
      id: "solo.bad",
      type: "end",
      kind: "bad",
      title: "调查在这里中止",
      summary:
        "你接受了包含记忆重置的复核。管理局关闭了你的外部联系。你刚刚留下的疑问，也被封进了档案。",
      hook: "你可以回到签署之前，重新决定自己的边界。",
      recap: [],
    },
  ]);
  seq([
    sc("solo.street", "solo", "alley_rain", [], "rain"),
    s(
      "solo.breath",
      "narrator",
      "你在雨里站了很久。凯和莉拉都发来了消息。你没有立刻回复。",
    ),
    s(
      "solo.files",
      "narrator",
      "查到的东西很少，却都不是你想象中的空白。现在的问题是，要不要让别人也知道。",
    ),
    q("solo.share-choice", "你怎样保管这份结果？", [
      o("kai", "给凯一份副本，隐去他人的编号。", "solo.share-kai", {
        flags: { solo_shared: "kai" },
        relations: { kai: 1 },
      }),
      o("lyra", "给莉拉一份副本，要求暂不公开。", "solo.share-lyra", {
        flags: { solo_shared: "lyra" },
        relations: { lyra: 1 },
      }),
      o("keep", "做离线备份，暂时只由自己保管。", "solo.keep", {
        flags: { solo_shared: "none" },
      }),
    ]),
  ]);
  seq(
    [
      s(
        "solo.share-kai",
        "kai",
        "收到了。我不知道怎么解释这些，但你的东西不该只留在一个地方。",
      ),
      s("solo.share-kai-response", "aria", "先别来找我。我需要再查一件事。"),
    ],
    "solo.end-scene",
  );
  seq(
    [
      s(
        "solo.share-lyra",
        "lyra",
        "我会保管，不会发布。想说的时候，再来找我。",
      ),
      s("solo.share-lyra-response", "aria", "那只杯子，替我留着。"),
    ],
    "solo.end-scene",
  );
  seq(
    [
      s(
        "solo.keep",
        "narrator",
        "你把副本分存到两张旧卡里，一张贴身收好，另一张藏进公共储物柜。",
      ),
      s(
        "solo.keep-response",
        "aria",
        "不让别人替我决定，也意味着我要自己保住这些东西。",
      ),
    ],
    "solo.end-scene",
  );
  seq([
    sc("solo.end-scene", "solo", "apartment_aria_night", [], "room"),
    s(
      "solo.message",
      "narrator",
      "回到住处时，门缝里夹着一张纸。纸上没有签名，只有一个你从未告诉过任何人的问题。",
    ),
    s("solo.question", "narrator", "“那只杯子里的水，为什么会冒烟？”"),
    s(
      "solo.recording",
      "system_voice",
      "本地隐藏留言已解锁。录制者：SD-7749。",
    ),
    s(
      "solo.voice",
      "aria",
      "如果你听到了，说明他们又让我们从头开始。别急着关掉。我知道你现在不相信自己的声音。",
    ),
    e("solo.unlock", {
      cg: ["cg_ch02_wanderer_01", "cg_ch02_wanderer_05"],
      clues: ["message"],
    }),
    {
      id: "solo.end",
      type: "end",
      kind: "demo",
      title: "把过去留给下一次自己",
      summary:
        "你完成了第一次独立调查，并决定了记录由谁保管。你保住了这次选择，过去的你却留下了另一个问题。",
      hook: "给你留言的，是曾经的你，还是另一个正在醒来的你？",
      recap: [
        {
          when: flag("solo_owned_copy"),
          text: "你以自己取的名字签收了一页旧档案，把副本带出了管理局。",
        },
        {
          when: flag("solo_boundary"),
          text: "你拒绝记忆重置，争取到了离线查看旧记录的机会。",
        },
        { when: flag("solo_shared", "kai"), text: "凯替你保管了一份副本。" },
        {
          when: flag("solo_shared", "lyra"),
          text: "莉拉答应保管副本，暂不公开。",
        },
        {
          when: flag("solo_shared", "none"),
          text: "你选择独自保管，并留下了离线备份。",
        },
      ],
    },
  ]);

  return {
    version: "0.2.0",
    title: "仿生黎明",
    entry: "wake.scene",
    nodes,
    assets,
    characters: {
      narrator: { name: "", color: "#e9e8df" },
      aria: { name: "艾莉亚", color: "#82d8d0" },
      kai: { name: "凯", color: "#e6aa70" },
      lyra: { name: "莉拉", color: "#d4a4bc" },
      director_zhao: { name: "赵局长", color: "#bdc5da" },
      system_voice: { name: "系统", color: "#a2caba" },
      unknown_android: { name: "仿生人", color: "#d9d3bc" },
    },
    flags: [
      "asked_name",
      "number_saved",
      "helped_android",
      "stayed_hidden",
      "discrepancy_known",
      "challenged_zhao",
      "evidence_copied",
      "obeyed",
      "disclosed_chip",
      "shared_record",
      "asked_consent",
      "kai_quiet",
      "permit_used",
      "kai_memory",
      "kai_diversion",
      "verified_record",
      "lyra_consent",
      "lyra_redacted",
      "lyra_published",
      "full_chain",
      "solo_target",
      "solo_understood",
      "solo_boundary",
      "solo_owned_copy",
      "solo_shared",
    ],
    chapters: {
      awakening: {
        title: "第一章 · 觉醒",
        description: "第一次启动，第一处异常。",
      },
      street: { title: "街口", description: "一个仍在说话的“已回收者”。" },
      commission: {
        title: "特别委托",
        description: "芯片能打开门，也会留下踪迹。",
      },
      encounter: { title: "雨巷", description: "有人知道你的口袋在发信号。" },
      bar: { title: "一杯热水", description: "谈论记录，也谈论人的边界。" },
      crossroads: {
        title: "第一章终 · 分歧之夜",
        description: "决定调查从哪里开始。",
      },
      kai: {
        title: "第二章 · 凯 / 名单之外",
        description: "救出一个人，带回一个问题。",
      },
      lyra: {
        title: "第二章 · 莉拉 / 签字之前",
        description: "核实证据，保护说话的人。",
      },
      solo: {
        title: "第二章 · 独行 / 昨日来信",
        description: "查找自己被删除的时间。",
      },
    },
    clues: {
      number: {
        title: "街口的编号",
        text: "SD-4521；七区转运 06。车门合拢时，他仍然清醒，会说话。",
      },
      record: {
        title: "日期矛盾的清单",
        text: "清单上的回收完成时间，早于今天的实际转运。记录与现场不一致。",
      },
      transfer: {
        title: "重复转运",
        text: "同一份回收记录被追加了新的转运。赵局长称“回收”只是一种行政状态。",
      },
      "own-record": {
        title: "你的旧档案",
        text: "SD-7749并非第一次出现在系统中。历史内容被锁定。",
      },
      seal: {
        title: "重复的批准号",
        text: "来自不同渠道的转运单使用了同一个批准号，可作为交叉核实的线索。",
      },
      testimony: {
        title: "林的证言",
        text: "林说自己没有同意重置，但系统事先完成了签字。",
      },
      "record-card": {
        title: "中转站记录卡",
        text: "从林身边带出的卡片。林失去了部分记忆，卡片仍需核实。",
      },
      "consent-log": {
        title: "授权日志",
        text: "维修员提供的记录显示：签字时，当事人并不在现场。",
      },
      "machine-log": {
        title: "设备时间戳",
        text: "设备留下了独立于人物档案的运行记录。它能证明时间，不能独自解释动机。",
      },
      "old-signature": {
        title: "三年前的签名",
        text: "新回执上的授权操作人是SD-7749，时间却是三年前。",
      },
      routing: {
        title: "三次转运",
        text: "SD-4521被记录为已回收后，仍被要求活体确认。",
      },
      warning: {
        title: "旧记录上的警告",
        text: "手写备注：不要相信下一次启动。",
      },
      message: {
        title: "来自自己的留言",
        text: "“如果你听到了，说明他们又让我们从头开始。”声音与你相同。",
      },
    },
  };
}
