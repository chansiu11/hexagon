"""Synthetic-only tests for stage-5 MP4 extraction. NOT source film parity tests."""
import importlib.util
import pathlib
import tempfile
import unittest
import cv2
import numpy as np

MODULE=pathlib.Path(__file__).resolve().parents[1]/'tools'/'transcribe-hyper-hexagoner.py'
spec=importlib.util.spec_from_file_location('stage5_transcriber',MODULE)
transcribe=importlib.util.module_from_spec(spec)
spec.loader.exec_module(transcribe)


class TranscriberTests(unittest.TestCase):
    def setUp(self):
        self.accent=np.asarray([170,80,230],dtype=np.uint8)
        self.image=np.zeros((600,960,3),dtype=np.uint8)
        self.image[:]=(35,35,35)
        self.image[:,480:]=(50,50,50)

    def test_color_mask_geometry_and_hole(self):
        color=tuple(int(v) for v in self.accent)
        cv2.rectangle(self.image,(670,150),(780,235),color,-1)
        cv2.rectangle(self.image,(705,185),(738,206),(35,35,35),-1)
        mask=transcribe.accent_mask(self.image,self.accent)
        walls=transcribe.polygonize(mask)
        self.assertEqual(len(walls),1)
        self.assertEqual(len(walls[0]['holes']),1)
        self.assertGreater(min(p[0] for p in walls[0]['points']),100)
        self.assertTrue(all(len(w['points'])>=3 for w in walls))

    def test_track_ids_are_stable_not_duplicated(self):
        color=tuple(int(v) for v in self.accent)
        tracker=transcribe.TrackIds()
        ids=[]
        for x in [665,660,654,648]:
            frame=self.image.copy()
            cv2.rectangle(frame,(x,210),(x+75,245),color,-1)
            shapes=transcribe.polygonize(transcribe.accent_mask(frame,self.accent))
            tracked=tracker.assign(shapes)
            self.assertEqual(len(tracked),1)
            ids.append(tracked[0]['id'])
        self.assertEqual(len(set(ids)),1)
        self.assertEqual(tracker.serial,1)

    def test_center_ship_is_not_a_lethal_wall(self):
        color=tuple(int(v) for v in self.accent)
        cv2.circle(self.image,(480,300),53,color,5)
        mask=transcribe.accent_mask(self.image,self.accent)
        self.assertEqual(transcribe.polygonize(mask),[])

    def test_probe_real_decodable_synthetic_video(self):
        with tempfile.TemporaryDirectory() as path:
            movie=pathlib.Path(path)/'fixture.avi'
            writer=cv2.VideoWriter(str(movie),cv2.VideoWriter_fourcc(*'MJPG'),
                                   30,(320,200))
            if not writer.isOpened():
                self.skipTest('OpenCV FFmpeg MJPG video encoder unavailable')
            for i in range(120):
                frame=np.full((200,320,3),(i%128,40,80),dtype=np.uint8)
                writer.write(frame)
            writer.release()
            info=transcribe.probe(movie)
            self.assertEqual(info['resolution'],[320,200])
            self.assertAlmostEqual(info['duration'],4,places=1)
            frames=list(transcribe.source_frames(movie,1.,2.,60))
            self.assertEqual(len(frames),61)
            self.assertEqual(frames[0][0],0)
            self.assertEqual(frames[-1][0],60)


    def test_sector_phase_follows_real_background_separator_lines(self):
        import math
        phase=.31
        sample=np.empty((600,960,3),dtype=np.uint8)
        # Synthetic alternating hexagonal sectors, not actual source footage.
        yy,xx=np.indices(sample.shape[:2])
        angle=np.mod(np.arctan2(yy-300,xx-480)-phase,2*math.pi)
        sector=np.floor(angle/(math.pi/3)).astype(int)%2
        sample[:]=np.where(sector[:,:,None]==0,
                           np.array([32,45,54],dtype=np.uint8),
                           np.array([105,122,136],dtype=np.uint8))
        wall_mask=np.zeros((600,960),dtype=np.uint8)
        cv2.rectangle(wall_mask,(580,230),(740,260),255,-1)
        found=transcribe.sector_phase_from_background(sample,wall_mask,6)
        circular=math.atan2(math.sin((found-phase)*6),
                             math.cos((found-phase)*6))/6
        self.assertLess(abs(circular),.020,
                        'camera sector phase did not match radial source lines')
        unwrapped=transcribe.sector_phase_from_background(
            sample,wall_mask,6,previous=phase+2*math.pi/6)
        self.assertLess(abs(unwrapped-(phase+2*math.pi/6)),.02)

    def test_sector_phase_refuses_flat_undetectable_background(self):
        solid=np.full((600,960,3),(49,49,49),dtype=np.uint8)
        mask=np.zeros((600,960),dtype=np.uint8)
        with self.assertRaises(ValueError):
            transcribe.sector_phase_from_background(solid,mask,6)


if __name__=='__main__':
    unittest.main()
