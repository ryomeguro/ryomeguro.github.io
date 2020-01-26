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
