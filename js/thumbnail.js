$(function(){
    //サムネイル画像をクリックした時の処理
    $('.workthumbnail').hover(function(){
        $(this).find('img').css({'opacity':1}).animate({'opacity':0.2},300);
        $(this).find('p').css({'opacity':0}).animate({'opacity':1},300);
        console.log("hover on");
    },function(){
        $(this).find('img').css({'opacity':0.2}).animate({'opacity':1},200);
        $(this).find('p').css({'opacity':1}).animate({'opacity':0},200);
        console.log("hover off");
    });

    $('.heading_02').on('hover', function(){
      console.log('clicked');
    });

});
