function getParam(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var games ={
  'karugamo': {
    title: 'カルガモ大行列',
    photos: [
      'images/game/karugamo01.png',
      'images/game/karugamo.png',
      'images/game/karugamo02.png',
    ],
    summary: [
      'カルガモ(親)を操作して、カルガモ大行列をつくるゲーム。カルガモ(親)が障害物やカルガモ(子)に衝突するとゲームオーバー。スネークゲームのようなゲームです。',
      'RPGゲームをつくる計画が頓挫してしまったので、そこで制作した動きを記録するプログラムを流用して作成。',
      'PCゲーム　UnityRoomにて公開中(リンクは下に)。'
    ],
    commitment: [
      'よくある"カルガモお引越しニュース映像風"にするために時刻表示やテロップなどを作成しました。ゲームオーバーもニュース速報っぽく知らせるようにしました。'
    ],
    comment: [
      'ゲーム会社の人に見てもらう機会があって、"アリのほうがいいんじゃない？"というコメントをもらいました。確かにそうだと思いました。',
      '遊んでくれた人から"早送り機能があるといいかも"というコメントをもらいました。こういうフィードバックをもらうことは初めてだったので嬉しかったです。すぐに実装しました。'
    ],
    hasLink: true,
    linkComment: 'こちらから遊べます。(PC)',
    link: 'https://unityroom.com/games/karugamo'
  },
  'kome': {
    title: '※こめざんまい※',
    photos: [
      'images/game/kome.png',
      'images/game/kome01.jpg',
      'images/game/kome02.jpg',
      'images/game/kome03.jpg',
      'images/game/kome04.jpg',
    ],
    summary: [
      'VIVE用ゲーム。和室の中で逃げ回るお米の妖精を、巨大なお箸(コントローラー)でつまんで、お釜に入れるゲームです。',
      'お米ごとにポイントが設定されていて、高ポイントのお米ほど動きが速いです。また水(お米が大きくなる)や納豆(お米の動きが遅くなる)などの特殊キャラも登場!激レアなシークレットキャラもいます。',
      'このゲームは大阪大学学園祭の時に竹村研究室で展示しています。是非遊びに来て下さい。'
    ],
    commitment: [
      'お米が逃げ回る時に、あわてて右往左往している感じを出しました。これはRobocodeの反重力移動を応用しています。',
      '和室は自分でモデリングしました。その際、お米に関するネタをたくさん詰め込みました。'
    ],
    comment: [
      'お米ネタの一つとして、お供え物のお米を和室に置いているのですが、その遺影の写真は私です。(遺影に他人の写真は使いづらかったので。)',
      '学園祭で遊んでくれた人から"面白い"、"かわいい"といった感想をいただき、製作者としてとても嬉しかったです。ただ一番嬉しかったのはお米が大きくなったときに遊んでいた人が"気持ち悪い!"と言っていたことです。狙っていたリアクションだったので、うまくいったと思いました。'
    ],
    hasLink: false,
  },
  'overrule': {
    title: 'OVERRULE',
    photos: [
      'images/game/overrule.png',
      'images/game/overrule1.png',
      'images/game/overrule2.png',
      'images/game/overrule3.png',
      'images/game/overrule4.png',
    ],
    summary: [
      'スクエアエニックスさんのインターンで制作し、特別賞をいただいたゲームです。プランナー1人、デザイナー2人、プログラマ2人で制作しました。',
      '3×3×3のルービックキューブのような立方体の上で行うチェスのようなゲームです。3種類のコマを使って相手のコマを取っていきます。',
      'このゲーム最大の特色は盤面の回転による奇襲です。回転すると重力方向にコマがずれます。この回転とコマの移動を組み合わせることで奇襲を仕掛けることが可能です。'
    ],
    commitment: [
      'ルール制作はチームの皆で関わりながら行いました。"奇襲を仕掛ける楽しさ"をテーマに無駄な要素や必要な要素を洗い出していきました。',
      'またシェーダーを用いることでなるべくUIを減らしたり、コマを見やすくしたりしました。'
    ],
    comment: [
      '制作期間は4日だったのですが、ほぼ半分ぐらいはルールの修正、改善のために費やしました。初期段階と比べるとテンポがよくなりました。',
      '立方体の表面上にコマがある、というのをどのようなデータ構造で表現するか、という部分に苦労しました。'
    ],
    hasLink: false,
  },
};

var GameGallary = new Vue({
  el:'#gameDescription',
  data:{
    game: ''
  },
  created: function(){
    var gameName = getParam('game');//games[getParam('game')];
    this.game = games[gameName];
  }
});
