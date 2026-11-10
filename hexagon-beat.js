/* Hexagon-only screen pulse sampled from the supplied 1557.mp4 at 30Hz.
 * Data are quantized 0.25-pixel core radii, not video, music, or textures.
 * This affects drawing zoom only; wall/world timing and collision are untouched. */
(function(root){'use strict';
const TRACK=`cnd3d3d3d3d2dnZ2Rnd3eXdUj3G3N7hXdUZ1d4d2V5d3dpmYl5l3dDZ3dXdlZ592t2VT9k9ar3PFVkRpp1Z3d3eGdXeZd4Z3djlmRYqod3d5eXiX9taXd4mFVXeXd3i4V3eXdYuHVkV1NZ90unFi9b9Tbvc7H2mP
dKZiRpdViYd3d3W_hfjYT333BZ96pfcUfPg5989zWJ-Ab28nd697n3Vnn4C2969wbPg8T3f219-Ej3YVeffJb3QJ9_kjRnn4C3YXql9y9p9gv3_nYvdH9-b3FHn3q2RW9vj3viQhj3zG90VY2HYUr4OS90SM-
Ir4L3ckz4Ok9zFs-EovdhSPeLT2so9v-E1ffPclz43F-HFI-HxE98btxxZ5-Sf4kWefj_l3P4h_lIH4U2z5XKX44H357l-V-
LbPorX5f4YPd2eWWfhfjtD4P3o6V2QUv4D4kPdzj3x_b_ZjrvitT4T3r3CPfY91RWXfld-S9_9wO_go92Jp99-K-VgmlfiD94L3v6n7JfpPlfim-Rb4b3k2n4L5P6KT-URVL3_3LPm_tLP5_4-fqa-
h-N95GPgPj_nfqZMWX5Q_g_eM-f51-W-In6Cfl_hvffjPefovqvn_j_hRj4h_fR9tFe-O-XT4z3tJYvaBRs97-Ff31niV9t9ef2v3n4WVFRZ19oKfdvivm5-U-LaW-
B9x9nb275b6H7GPo_kfhldz9yD3P6H6pPmPh_ffcG93X2lH9u-P91T4D3f29J94j3D2gSr3f4SA9xb3yA9s9jOfcfg9hPd199f3T2slv3_4x_f_d6-Qj4P3ce-g-pY_l_iPdjd0Ihffbvd_gPifk_oZ-b-
P9_LPldlwD4dm999wVZ99-T-ib5H4H3efiW90IfcflPf_ky989yJnYfWRr2z3X4CS9rMHdfVDn1rfcrP2ZXdj9UPfc_fYYfaxM0L00vU_efgm959q9eV9RPVG9e9_-LtC909rV1H1Zb9w-
AgPaPX49sf1_1YG73XS9o9aOLcgVN72XW9g9Ub1t_U0WO9vw_YgWbb1EZ9a73GPZkMX1vUo9h9r7cb3I3dB9Z9Qr233yT9tGPcoP2P1la9m9z1fa292j2_1_1YUr2b3KT9iCfa8T1z1RH9Z9k9u94gPXo91sPX_V
J9v-Eovc_Zmlz9YQ_Wfg998909mOfbI9k9aQZ9l96o_bPYG1vV_T2Xvc-Yh9fX2VvWfTF73H3m7b3j2d_d9b2_2Vr90-C-OgfflX3H2gG9o-O4Phvfg-A-Rf4D3Vvhvb_kPmm-
R-E94r5GvhfcTHvkuH4n3gmiUL2Rr9z9_-Kj4P3JNhfaH90-A-g0_lPhik_dT9m9en3n5OvjPgUaHYPaX95-F-Vf4g3Z1939qKs73z4Tod19_E_aZ-C-Kp_hRZ5pfcAj3T4H4_5qTMPgfcy9iX2n5X6L65vnvjCZ
fe_cgbfj_o5-b-M9-b4VfcyQ7-G-gofjvf3-
Nk_gvcir4j5r4D5X4z3X21m9i9ZP0zfevipY_e_c2dA9fXPd_g3959qB7lR9ZZjRp9Zyrf131CfY5NTQvSxeYd0Nq9RqJc0eXdlZPQlQ3mFdjj0P1GouHYWdlZ2NDV3dWNq9Jn0MkF7h59Gl1Nod3YiR3v0zYuIZ
Gd2NUV3Q0d5ePS_WJVGiXFpd29IB7h1ePTvW_aan3qWRnUWeveYQWV4lvZFdXjfcrlfbFeXn3aYUVSplxW_g_ouX5v4v30fbFQWffhPjT-
AVjUU9kN_aPhtYPdfbY92hC9lO_cfgcX3pFU1VquHz434P3M_Z2d3r3v4uU98R1H2URn275HPjfhfdwBmmHn3XPh3959uv46vgvcz-K2_qfsdX6T5Il-D93Nq-I-
bxgI_gfeSNXz4z5-Q-J9_aWP3BXn3r4b5CpH4UDVvb2v4f5zl-Q9-919s5x9Vb2h_V_TxZ2OI3PWfcffPhfjeb4X3Uni475_nU_k_g0Y0Rt-R-f-nlfm_iifXFHv5q1dPihKPiH-Ar5z6SE-V-F99RZ-
Cq_k9-klkH434Vnl376XGL5b4cWdh3fn_p0L5Ap-bf4z35XWvj7eTP4VHYK3577Ofrfofk1tPgG-LqPmfp6b6H5NZX4Er-V7t1vpPmj-MWvno-TW4YvgPdyWJivhfjvlslPjm-
Vb4f38ld9-X-hg_jvfvcH95uN-g1g-V-M9-D29o93pfcI-B-Ob373Br9_yXesynT4T3o8-DiK3oL4EkZ2WIuHv4y1-A90SLqK-FtWP3hCBouKudNfb0d3lvZZ93qNf3gE9kf3H3zrhgA_aPX_V69utfZI9y0_a_X
xRvTX3faaZM92f2z182llf2P3CV9j9aJov2X229u6X3QjQvW0XPc_fYYPa_YDRnd79n912HT2v171WPYrefcJioP2L1j0mPYLefdPgMcCH2EXuHj2n3SZYPYfVPTK9l33T3_4f5-
vl_hvdvbjuod575CiL333IH9zdWv4f3h_jvhPdUV9-KtXi3P4EEbPlZ-ICPipdiNPdo-Hf3gq-N-Xhi-F95SNdb-Z-of5_5b4j4Avc31_cVz4v5OF-E94NI9-zc-YrXP5MPfvcCaXn3eVH2f1xXb1FozfZ_d9xi9
n9bZja_b_f5D3H2UTNquM92-Bh5T3L2kRZ3v3a1MPZR9Wn26i9dr3_5OPiPeg9nFnQ2nPducvafXxj2R_WEz3D3n4FvdfZAavb9b2xph09g9WV89rqNp4-Bb3X2b14H9fiPau7X919nX23fhrYc-msB-
T-D97VEab-Kt0979xR5effJv4_5up-sk_mviARlffjPmPoo-Z-J9_H2uPgLz6PFdPkfiQ95aauJ-
PwxJnd3m_kvsOc_nhQ_g_dz98-c12P5L4mfl3-JH3tI74n5L5v6OBIviPele_i_mrYTeYX4v4No35Hu51T5FHZfk_rs-r-fInlxP4Rt-ctvlze3-OAzaPh9qGYPgCU0fPi8qV-F98HL-Iha-
coxaZb474UAj4b5P52E-OD3wfY_Wh9FXe9e7cqdn4WK-bpIp0JPixaO6H`;
const ABC="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function unpack(s,n){
 const bytes=[];let bits=0,v=0;
 for(const c of s.replace(/\s/g,'')){
  const k=ABC.indexOf(c);if(k<0)throw Error('Invalid pulse trace');
  v=v<<6|k;bits+=6;if(bits>=8){bits-=8;bytes.push(v>>bits&255);}
 }
 const out=new Uint8Array(n);out[0]=bytes[0];let pos=0;
 function nib(){const b=bytes[1+(pos>>1)];return pos++&1?b&15:b>>4;}
 for(let i=1;i<n;i++){const k=nib();out[i]=k===15?(nib()<<4)|nib():out[i-1]+k-7;}
 return out;
}
const SAMPLES=2761,VIDEO_BEGIN=3,VIDEO_END=95,PLAY_START=3.5,CLOCK_RATE=25/24;
const q=unpack(TRACK,SAMPLES);
function sourceRadius(t){
 const frame=Math.max(0,Math.min(SAMPLES-1,(t-VIDEO_BEGIN)*30));
 // Display the measured source frame at its actual 30 Hz timestamp.
 // Do not invent in-between easing that softens the recorded beat attack.
 const i=Math.floor(frame+1e-7);
 return 20+q[i]/4;
}
function zoom(gameTime){
 const videoTime=PLAY_START+gameTime/CLOCK_RATE;
 if(videoTime<VIDEO_BEGIN||videoTime>VIDEO_END)return null;
 // 50-unit hexagon, 1.2x source 1152/960, 0.92:1 affine hard camera.
 const projection=50*1.2*Math.cos(Math.PI/6)*.96;
 return sourceRadius(videoTime)/projection;
}
const API={zoom,sourceRadius,PLAY_START,VIDEO_BEGIN,VIDEO_END,SAMPLES,CLOCK_RATE,
 CAMERA_VERSION:'source-hexagon-pulse-30hz-v1'};
if(typeof module!=='undefined')module.exports=API;else root.HexHexagonBeat=API;
})(typeof window!=='undefined'?window:globalThis);
